package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"music-app/streaming-service/internal/domain"
)

// PostgresSessionRepository implements domain.SessionRepository using PostgreSQL.
type PostgresSessionRepository struct {
	pool *pgxpool.Pool
}

func NewSessionRepository(pool *pgxpool.Pool) *PostgresSessionRepository {
	return &PostgresSessionRepository{pool: pool}
}

func (r *PostgresSessionRepository) Insert(ctx context.Context, s *domain.PlaySession) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO play_sessions
			(id, user_id, track_id, started_at, position_ms, duration_ms, completed, status, source, bitrate)
		VALUES ($1, $2, $3, NOW(), 0, 0, FALSE, 'PLAYING', $4, $5)
	`, s.ID, s.UserID, s.TrackID, s.Source, s.Bitrate)
	if err != nil {
		return fmt.Errorf("insert play_session: %w", err)
	}
	return nil
}

func (r *PostgresSessionRepository) Get(ctx context.Context, sessionID, userID string) (*domain.PlaySession, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, track_id, started_at, ended_at,
		       position_ms, duration_ms, completed, status, source, bitrate, end_reason
		FROM play_sessions
		WHERE id = $1 AND user_id = $2
	`, sessionID, userID)
	return scanSession(row)
}

// UpdateHeartbeat updates position, duration, and completion flag.
// When outbox is non-nil, the session UPDATE and outbox INSERT run in a single transaction,
// guaranteeing at-least-once delivery of the TrackPlayedEvent.
func (r *PostgresSessionRepository) UpdateHeartbeat(ctx context.Context, sessionID string, positionMs, durationMs int, completed bool, outbox *domain.OutboxEvent) (*domain.PlaySession, error) {
	const sessionSQL = `
		UPDATE play_sessions
		SET position_ms = $1, duration_ms = $2, completed = $3
		WHERE id = $4
		RETURNING id, user_id, track_id, started_at, ended_at,
		          position_ms, duration_ms, completed, status, source, bitrate, end_reason`

	if outbox == nil {
		return scanSession(r.pool.QueryRow(ctx, sessionSQL, positionMs, durationMs, completed, sessionID))
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	session, err := scanSession(tx.QueryRow(ctx, sessionSQL, positionMs, durationMs, completed, sessionID))
	if err != nil {
		return nil, err
	}
	if err := insertOutbox(ctx, tx, outbox); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit heartbeat+outbox tx: %w", err)
	}
	return session, nil
}

// End marks the session as ENDED. When outbox is non-nil both writes are atomic.
func (r *PostgresSessionRepository) End(ctx context.Context, sessionID string, positionMs, durationMs int, completed bool, endReason string, outbox *domain.OutboxEvent) (*domain.PlaySession, error) {
	const sessionSQL = `
		UPDATE play_sessions
		SET status = 'ENDED', ended_at = NOW(),
		    position_ms = $1, duration_ms = $2, completed = $3, end_reason = $4
		WHERE id = $5
		RETURNING id, user_id, track_id, started_at, ended_at,
		          position_ms, duration_ms, completed, status, source, bitrate, end_reason`

	if outbox == nil {
		return scanSession(r.pool.QueryRow(ctx, sessionSQL, positionMs, durationMs, completed, endReason, sessionID))
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	session, err := scanSession(tx.QueryRow(ctx, sessionSQL, positionMs, durationMs, completed, endReason, sessionID))
	if err != nil {
		return nil, err
	}
	if err := insertOutbox(ctx, tx, outbox); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit end+outbox tx: %w", err)
	}
	return session, nil
}

func (r *PostgresSessionRepository) GetHistory(ctx context.Context, userID string, page, size int) ([]domain.HistoryEntry, int64, error) {
	offset := page * size
	rows, err := r.pool.Query(ctx, `
		SELECT ps.id, ps.user_id, ps.track_id, ps.started_at, ps.ended_at,
		       ps.position_ms, ps.duration_ms, ps.completed, ps.status,
		       ps.source, ps.bitrate, ps.end_reason,
		       tc.title, tc.artist_name, tc.cover_url
		FROM play_sessions ps
		LEFT JOIN track_cache tc ON ps.track_id = tc.track_id
		WHERE ps.user_id = $1 AND ps.completed = TRUE
		ORDER BY ps.started_at DESC
		LIMIT $2 OFFSET $3
	`, userID, size, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query play history: %w", err)
	}
	defer rows.Close()

	entries, err := scanHistoryRows(rows)
	if err != nil {
		return nil, 0, err
	}

	var total int64
	if err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM play_sessions WHERE user_id = $1 AND completed = TRUE`,
		userID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count history: %w", err)
	}
	return entries, total, nil
}

func (r *PostgresSessionRepository) GetRecentlyPlayed(ctx context.Context, userID string, limit int) ([]domain.HistoryEntry, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT ON (ps.track_id)
		       ps.id, ps.user_id, ps.track_id, ps.started_at, ps.ended_at,
		       ps.position_ms, ps.duration_ms, ps.completed, ps.status,
		       ps.source, ps.bitrate, ps.end_reason,
		       tc.title, tc.artist_name, tc.cover_url
		FROM play_sessions ps
		LEFT JOIN track_cache tc ON ps.track_id = tc.track_id
		WHERE ps.user_id = $1 AND ps.completed = TRUE
		ORDER BY ps.track_id, ps.started_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("query recently played: %w", err)
	}
	defer rows.Close()
	return scanHistoryRows(rows)
}

func (r *PostgresSessionRepository) GetStats(ctx context.Context, userID string) (*domain.ListeningStats, error) {
	stats := &domain.ListeningStats{}

	if err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(duration_ms), 0), COUNT(DISTINCT track_id), COUNT(*)
		FROM play_sessions
		WHERE user_id = $1 AND completed = TRUE
	`, userID).Scan(&stats.TotalListeningMs, &stats.TotalTracks, &stats.TotalSessions); err != nil {
		return nil, fmt.Errorf("stats aggregate: %w", err)
	}

	genreRows, err := r.pool.Query(ctx, `
		SELECT tc.genre, COUNT(*) AS cnt, COALESCE(SUM(ps.duration_ms), 0) AS total_ms
		FROM play_sessions ps
		JOIN track_cache tc ON ps.track_id = tc.track_id
		WHERE ps.user_id = $1 AND ps.completed = TRUE AND tc.genre IS NOT NULL AND tc.genre <> ''
		GROUP BY tc.genre ORDER BY cnt DESC LIMIT 5
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("top genres: %w", err)
	}
	defer genreRows.Close()
	for genreRows.Next() {
		var g domain.GenreCount
		if err := genreRows.Scan(&g.Genre, &g.Count, &g.TotalMs); err != nil {
			return nil, fmt.Errorf("scan genre: %w", err)
		}
		stats.TopGenres = append(stats.TopGenres, g)
	}
	if stats.TopGenres == nil {
		stats.TopGenres = []domain.GenreCount{}
	}

	artistRows, err := r.pool.Query(ctx, `
		SELECT tc.artist_id, tc.artist_name, COUNT(*) AS cnt
		FROM play_sessions ps
		JOIN track_cache tc ON ps.track_id = tc.track_id
		WHERE ps.user_id = $1 AND ps.completed = TRUE AND tc.artist_id IS NOT NULL
		GROUP BY tc.artist_id, tc.artist_name ORDER BY cnt DESC LIMIT 5
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("top artists: %w", err)
	}
	defer artistRows.Close()
	for artistRows.Next() {
		var a domain.ArtistCount
		if err := artistRows.Scan(&a.ArtistID, &a.ArtistName, &a.Count); err != nil {
			return nil, fmt.Errorf("scan artist: %w", err)
		}
		stats.TopArtists = append(stats.TopArtists, a)
	}
	if stats.TopArtists == nil {
		stats.TopArtists = []domain.ArtistCount{}
	}
	return stats, nil
}

// insertOutbox writes one outbox row within an existing transaction.
func insertOutbox(ctx context.Context, tx pgx.Tx, evt *domain.OutboxEvent) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO outbox_events (id, event_type, payload)
		VALUES ($1, $2, $3)
	`, evt.ID, evt.EventType, evt.Payload)
	if err != nil {
		return fmt.Errorf("insert outbox_event: %w", err)
	}
	return nil
}

func scanSession(row pgx.Row) (*domain.PlaySession, error) {
	var s domain.PlaySession
	var status string
	err := row.Scan(
		&s.ID, &s.UserID, &s.TrackID, &s.StartedAt, &s.EndedAt,
		&s.PositionMs, &s.DurationMs, &s.Completed, &status,
		&s.Source, &s.Bitrate, &s.EndReason,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan session: %w", err)
	}
	s.Status = domain.SessionStatus(status)
	return &s, nil
}

func scanHistoryRows(rows pgx.Rows) ([]domain.HistoryEntry, error) {
	var entries []domain.HistoryEntry
	for rows.Next() {
		var e domain.HistoryEntry
		var status string
		if err := rows.Scan(
			&e.Session.ID, &e.Session.UserID, &e.Session.TrackID,
			&e.Session.StartedAt, &e.Session.EndedAt,
			&e.Session.PositionMs, &e.Session.DurationMs, &e.Session.Completed, &status,
			&e.Session.Source, &e.Session.Bitrate, &e.Session.EndReason,
			&e.TrackTitle, &e.ArtistName, &e.CoverURL,
		); err != nil {
			return nil, fmt.Errorf("scan history row: %w", err)
		}
		e.Session.Status = domain.SessionStatus(status)
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []domain.HistoryEntry{}
	}
	return entries, nil
}
