package domain

import (
	"context"
	"errors"
	"io"
)

var (
	ErrNotFound            = errors.New("not found")
	ErrRangeNotSatisfiable = errors.New("range not satisfiable")
)

// CatalogClient fetches track metadata from the Catalog service.
type CatalogClient interface {
	GetTrack(ctx context.Context, trackID string) (*TrackCache, error)
}

// EventPublisher publishes a TrackPlayedPayload to the message broker.
// Used exclusively by the OutboxPoller — the use case writes to the outbox table instead.
type EventPublisher interface {
	PublishTrackPlayed(ctx context.Context, payload TrackPlayedPayload) error
}

// PlayCounter buffers play counts in a fast store (Redis).
// Best-effort: failures are logged but do not affect session persistence.
type PlayCounter interface {
	IncrPlayCount(ctx context.Context, trackID string) error
}

// AudioStore streams audio binary data from object storage.
type AudioStore interface {
	// GetObject returns a reader for [start, end] byte range.
	// Pass start=0, end=-1 to stream the full object.
	GetObject(ctx context.Context, storageURL string, start, end int64) (io.ReadCloser, int64, error)
}
