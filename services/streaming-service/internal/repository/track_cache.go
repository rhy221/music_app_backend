package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"music-app/streaming-service/internal/domain"
)

// PostgresTrackCacheRepository implements domain.TrackCacheRepository using PostgreSQL.
type PostgresTrackCacheRepository struct {
	pool *pgxpool.Pool
}

func NewTrackCacheRepository(pool *pgxpool.Pool) *PostgresTrackCacheRepository {
	return &PostgresTrackCacheRepository{pool: pool}
}

func (r *PostgresTrackCacheRepository) Get(ctx context.Context, trackID string) (*domain.TrackCache, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT track_id, title, duration_ms, genre, artist_id, artist_name, cover_url, asset_urls, updated_at
		FROM track_cache WHERE track_id = $1
	`, trackID)

	var tc domain.TrackCache
	var assetJSON []byte
	err := row.Scan(
		&tc.TrackID, &tc.Title, &tc.DurationMs, &tc.Genre,
		&tc.ArtistID, &tc.ArtistName, &tc.CoverURL, &assetJSON, &tc.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan track_cache: %w", err)
	}
	if err := json.Unmarshal(assetJSON, &tc.AssetURLs); err != nil {
		return nil, fmt.Errorf("unmarshal asset_urls: %w", err)
	}
	return &tc, nil
}

func (r *PostgresTrackCacheRepository) Upsert(ctx context.Context, tc *domain.TrackCache) error {
	assetJSON, err := json.Marshal(tc.AssetURLs)
	if err != nil {
		return fmt.Errorf("marshal asset_urls: %w", err)
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO track_cache (track_id, title, duration_ms, genre, artist_id, artist_name, cover_url, asset_urls, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		ON CONFLICT (track_id) DO UPDATE SET
			title       = EXCLUDED.title,
			duration_ms = EXCLUDED.duration_ms,
			genre       = EXCLUDED.genre,
			artist_id   = EXCLUDED.artist_id,
			artist_name = EXCLUDED.artist_name,
			cover_url   = EXCLUDED.cover_url,
			asset_urls  = EXCLUDED.asset_urls,
			updated_at  = NOW()
	`, tc.TrackID, tc.Title, tc.DurationMs, tc.Genre, tc.ArtistID, tc.ArtistName, tc.CoverURL, assetJSON)
	if err != nil {
		return fmt.Errorf("upsert track_cache: %w", err)
	}
	return nil
}

func (r *PostgresTrackCacheRepository) Delete(ctx context.Context, trackID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM track_cache WHERE track_id = $1`, trackID)
	return err
}
