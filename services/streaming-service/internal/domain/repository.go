package domain

import "context"

// SessionRepository is the port for persisting and querying play sessions.
// UpdateHeartbeat and End accept an optional *OutboxEvent; when non-nil the
// implementation writes both the session update and the outbox row in one transaction.
type SessionRepository interface {
	Insert(ctx context.Context, s *PlaySession) error
	Get(ctx context.Context, sessionID, userID string) (*PlaySession, error)
	UpdateHeartbeat(ctx context.Context, sessionID string, positionMs, durationMs int, completed bool, outbox *OutboxEvent) (*PlaySession, error)
	End(ctx context.Context, sessionID string, positionMs, durationMs int, completed bool, reason string, outbox *OutboxEvent) (*PlaySession, error)
	GetHistory(ctx context.Context, userID string, page, size int) ([]HistoryEntry, int64, error)
	GetRecentlyPlayed(ctx context.Context, userID string, limit int) ([]HistoryEntry, error)
	GetStats(ctx context.Context, userID string) (*ListeningStats, error)
}

// TrackCacheRepository is the port for the local track metadata read model.
type TrackCacheRepository interface {
	Get(ctx context.Context, trackID string) (*TrackCache, error)
	Upsert(ctx context.Context, tc *TrackCache) error
	Delete(ctx context.Context, trackID string) error
}

// OutboxRepository is the port for the transactional outbox table.
type OutboxRepository interface {
	// FetchPending returns up to limit unpublished events ordered by created_at.
	FetchPending(ctx context.Context, limit int) ([]OutboxEvent, error)
	// MarkPublished sets published_at = NOW() for the given event.
	MarkPublished(ctx context.Context, id string) error
	// IncrRetryCount increments retry_count; events with count ≥ 5 are skipped by FetchPending.
	IncrRetryCount(ctx context.Context, id string) error
}
