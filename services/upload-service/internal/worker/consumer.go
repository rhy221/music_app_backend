package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/team/music-app/libs/go-common/rabbitmq"
	musicevents "music-app/music-events/events"
	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

const (
	catalogExchange = "events.catalog"
	catalogQueue    = "upload-service.catalog.events"
	bindingKey      = "events.track.published"
)

type CatalogConsumer struct {
	conn    *rabbitmq.Connection
	jobRepo port.JobRepository
	outbox  port.OutboxRepository
	log     zerolog.Logger
}

func NewCatalogConsumer(conn *rabbitmq.Connection, jobRepo port.JobRepository, outbox port.OutboxRepository, log zerolog.Logger) *CatalogConsumer {
	return &CatalogConsumer{
		conn:    conn,
		jobRepo: jobRepo,
		outbox:  outbox,
		log:     log.With().Str("component", "catalog-consumer").Logger(),
	}
}

func (c *CatalogConsumer) Setup() error {
	ch := c.conn.Channel()

	if err := ch.ExchangeDeclare(catalogExchange, "topic", true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare exchange %s: %w", catalogExchange, err)
	}
	if _, err := ch.QueueDeclare(catalogQueue, true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare queue %s: %w", catalogQueue, err)
	}
	if err := ch.QueueBind(catalogQueue, bindingKey, catalogExchange, false, nil); err != nil {
		return fmt.Errorf("bind queue: %w", err)
	}
	return nil
}

func (c *CatalogConsumer) Start(ctx context.Context) {
	consumer := rabbitmq.NewConsumer(c.conn, catalogQueue, c.handle,
		rabbitmq.WithPrefetchCount(5),
		rabbitmq.WithRetryCount(3),
	)
	if err := consumer.Start(ctx); err != nil {
		c.log.Error().Err(err).Msg("catalog consumer error")
	}
}

func (c *CatalogConsumer) handle(body []byte) error {
	var evt musicevents.TrackPublishedEvent
	if err := json.Unmarshal(body, &evt); err != nil {
		c.log.Warn().Err(err).Msg("unmarshal TrackPublishedEvent")
		return nil // discard malformed
	}
	if evt.Data.UploadJobID == nil {
		return nil
	}
	jobID := *evt.Data.UploadJobID
	trackID := evt.Data.TrackID

	updated, err := c.jobRepo.SetPublished(context.Background(), jobID, trackID)
	if err != nil {
		c.log.Error().Err(err).Str("jobId", jobID).Msg("SetPublished failed")
		return fmt.Errorf("set job published: %w", err)
	}

	if !updated {
		// Job was CANCELLED before track was published — compensate by deleting the ghost track.
		c.log.Info().Str("jobId", jobID).Str("trackId", trackID).Msg("job CANCELLED, scheduling ghost track deletion")
		return c.scheduleTrackDeletion(trackID)
	}

	c.log.Info().Str("jobId", jobID).Str("trackId", trackID).Msg("job marked PUBLISHED")
	return nil
}

func (c *CatalogConsumer) scheduleTrackDeletion(trackID string) error {
	payload, err := json.Marshal(musicevents.TrackDeletedEvent{
		Header: musicevents.EventHeader{
			EventID:       uuid.New().String(),
			EventType:     musicevents.EventTypeTrackDeleted,
			Timestamp:     time.Now().UTC(),
			SourceService: serviceName,
		},
		Data: musicevents.TrackDeletedData{TrackID: trackID},
	})
	if err != nil {
		return fmt.Errorf("marshal TrackDeletedEvent: %w", err)
	}
	return c.outbox.Insert(context.Background(), &domain.OutboxEvent{
		ID:         uuid.New().String(),
		EventType:  musicevents.EventTypeTrackDeleted,
		Exchange:   musicevents.Exchanges.Upload,
		RoutingKey: musicevents.RoutingKeys.TrackDeleted,
		Payload:    payload,
		CreatedAt:  time.Now().UTC(),
	})
}
