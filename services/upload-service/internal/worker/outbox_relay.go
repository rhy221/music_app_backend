package worker

import (
	"context"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog"
	"github.com/team/music-app/libs/go-common/rabbitmq"
	"music-app/upload-service/internal/port"
)

// OutboxRelay polls the outbox_events table and publishes pending events to RabbitMQ.
// It runs atomically: fetch → publish → mark processed, guaranteeing at-least-once delivery.
type OutboxRelay struct {
	outbox   port.OutboxRepository
	conn     *rabbitmq.Connection
	log      zerolog.Logger
	interval time.Duration
	batchSize int
}

func NewOutboxRelay(outbox port.OutboxRepository, conn *rabbitmq.Connection, log zerolog.Logger) *OutboxRelay {
	return &OutboxRelay{
		outbox:    outbox,
		conn:      conn,
		log:       log.With().Str("component", "outbox-relay").Logger(),
		interval:  2 * time.Second,
		batchSize: 50,
	}
}

func (r *OutboxRelay) Run(ctx context.Context) {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.flush(ctx)
		}
	}
}

func (r *OutboxRelay) flush(ctx context.Context) {
	events, err := r.outbox.FetchUnprocessed(ctx, r.batchSize)
	if err != nil {
		r.log.Error().Err(err).Msg("fetch outbox events")
		return
	}

	ch := r.conn.Channel()
	for _, evt := range events {
		msg := amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         evt.Payload,
		}
		if err := ch.Publish(evt.Exchange, evt.RoutingKey, false, false, msg); err != nil {
			r.log.Error().Err(err).Str("eventId", evt.ID).Str("type", evt.EventType).Msg("publish failed")
			if markErr := r.outbox.MarkFailed(ctx, evt.ID, err.Error()); markErr != nil {
				r.log.Error().Err(markErr).Str("eventId", evt.ID).Msg("mark failed")
			}
			continue
		}
		if err := r.outbox.MarkProcessed(ctx, evt.ID); err != nil {
			r.log.Error().Err(err).Str("eventId", evt.ID).Msg("mark processed")
		}
	}
}
