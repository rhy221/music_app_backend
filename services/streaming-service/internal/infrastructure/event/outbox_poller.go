package event

import (
	"context"
	"encoding/json"
	"time"

	"github.com/rs/zerolog"
	"music-app/streaming-service/internal/domain"
)

const (
	pollInterval = 5 * time.Second
	batchSize    = 100
)

// OutboxPoller reads unpublished events from outbox_events and publishes them to RabbitMQ.
// It runs as a background goroutine and guarantees at-least-once delivery of TrackPlayedEvents.
type OutboxPoller struct {
	outbox    domain.OutboxRepository
	publisher domain.EventPublisher
	log       zerolog.Logger
}

func NewOutboxPoller(outbox domain.OutboxRepository, publisher domain.EventPublisher, log zerolog.Logger) *OutboxPoller {
	return &OutboxPoller{
		outbox:    outbox,
		publisher: publisher,
		log:       log.With().Str("component", "outbox-poller").Logger(),
	}
}

// Start polls for pending events on a fixed interval. Blocks until ctx is cancelled.
func (p *OutboxPoller) Start(ctx context.Context) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	p.log.Info().Dur("interval", pollInterval).Msg("outbox poller started")

	// Poll once immediately on startup to drain any events left from a previous crash.
	p.poll(ctx)

	for {
		select {
		case <-ctx.Done():
			p.log.Info().Msg("outbox poller stopped")
			return
		case <-ticker.C:
			p.poll(ctx)
		}
	}
}

func (p *OutboxPoller) poll(ctx context.Context) {
	events, err := p.outbox.FetchPending(ctx, batchSize)
	if err != nil {
		p.log.Error().Err(err).Msg("fetch pending outbox events failed")
		return
	}
	for _, evt := range events {
		if err := p.dispatch(ctx, evt); err != nil {
			p.log.Error().Err(err).
				Str("id", evt.ID).
				Str("eventType", evt.EventType).
				Int("retryCount", evt.RetryCount).
				Msg("publish failed, incrementing retry count")
			_ = p.outbox.IncrRetryCount(ctx, evt.ID)
			continue
		}
		if err := p.outbox.MarkPublished(ctx, evt.ID); err != nil {
			// Not critical — the event was published; we'll just re-publish on the next poll (idempotent consumers handle duplicates).
			p.log.Warn().Err(err).Str("id", evt.ID).Msg("mark published failed")
		}
	}
}

// dispatch deserialises and publishes a single outbox event.
func (p *OutboxPoller) dispatch(ctx context.Context, evt domain.OutboxEvent) error {
	switch evt.EventType {
	case "TrackPlayed":
		var payload domain.TrackPlayedPayload
		if err := json.Unmarshal(evt.Payload, &payload); err != nil {
			p.log.Warn().Err(err).Str("id", evt.ID).Msg("unmarshal TrackPlayedPayload failed — skipping malformed event")
			_ = p.outbox.MarkPublished(ctx, evt.ID) // poison-pill: mark done so it doesn't block the queue
			return nil
		}
		return p.publisher.PublishTrackPlayed(ctx, payload)
	default:
		p.log.Warn().Str("eventType", evt.EventType).Str("id", evt.ID).Msg("unknown outbox event type — skipping")
		_ = p.outbox.MarkPublished(ctx, evt.ID)
		return nil
	}
}
