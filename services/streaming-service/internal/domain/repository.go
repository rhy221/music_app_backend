package domain

import "context"

// SessionRepository is the port for persisting and querying play sessions.
type SessionRepository interface {
	Insert(ctx context.Context, s *PlaySession) error
	Get(ctx context.Context, sessionID, userID string) (*PlaySession, error)
	UpdateHeartbeat(ctx context.Context, sessionID string, positionMs, durationMs int, completed bool) (*PlaySession, error)
	End(ctx context.Context, sessionID string, positionMs, durationMs int, completed bool, reason string) (*PlaySession, error)
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
