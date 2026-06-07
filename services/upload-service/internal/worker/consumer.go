package worker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/rs/zerolog"
	"github.com/team/music-app/libs/go-common/rabbitmq"
	musicevents "music-app/music-events/events"
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
	log     zerolog.Logger
}

func NewCatalogConsumer(conn *rabbitmq.Connection, jobRepo port.JobRepository, log zerolog.Logger) *CatalogConsumer {
	return &CatalogConsumer{
		conn:    conn,
		jobRepo: jobRepo,
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
	if err := c.jobRepo.SetPublished(context.Background(), jobID, trackID); err != nil {
		c.log.Error().Err(err).Str("jobId", jobID).Msg("SetPublished failed")
		return fmt.Errorf("set job published: %w", err)
	}
	c.log.Info().Str("jobId", jobID).Str("trackId", trackID).Msg("job marked PUBLISHED")
	return nil
}
