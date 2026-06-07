package event

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/rs/zerolog"
	"github.com/team/music-app/libs/go-common/rabbitmq"
	musicevents "music-app/music-events/events"
	"music-app/streaming-service/internal/domain"
)

const (
	catalogExchange = "events.catalog"
	catalogQueue    = "streaming-service.catalog.events"
)

// CatalogConsumer keeps the local track_cache in sync with Catalog events.
type CatalogConsumer struct {
	conn      *rabbitmq.Connection
	trackRepo domain.TrackCacheRepository
	log       zerolog.Logger
}

func NewCatalogConsumer(conn *rabbitmq.Connection, trackRepo domain.TrackCacheRepository, log zerolog.Logger) *CatalogConsumer {
	return &CatalogConsumer{
		conn:      conn,
		trackRepo: trackRepo,
		log:       log.With().Str("component", "catalog-consumer").Logger(),
	}
}

// Setup declares the exchange, queue, and all routing key bindings. Call once at startup.
func (c *CatalogConsumer) Setup() error {
	ch := c.conn.Channel()

	if err := ch.ExchangeDeclare(catalogExchange, "topic", true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare exchange %s: %w", catalogExchange, err)
	}
	if _, err := ch.QueueDeclare(catalogQueue, true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare queue %s: %w", catalogQueue, err)
	}

	for _, key := range []string{
		musicevents.RoutingKeys.TrackPublished,
		musicevents.RoutingKeys.TrackUpdated,
		musicevents.RoutingKeys.TrackDeleted,
	} {
		if err := ch.QueueBind(catalogQueue, key, catalogExchange, false, nil); err != nil {
			return fmt.Errorf("bind %s: %w", key, err)
		}
	}

	c.log.Info().Str("queue", catalogQueue).Str("exchange", catalogExchange).Msg("catalog consumer setup complete")
	return nil
}

// Start begins consuming. Blocks until ctx is cancelled.
func (c *CatalogConsumer) Start(ctx context.Context) {
	consumer := rabbitmq.NewConsumer(c.conn, catalogQueue, c.handle,
		rabbitmq.WithPrefetchCount(10),
		rabbitmq.WithRetryCount(3),
	)
	c.log.Info().Str("queue", catalogQueue).Msg("catalog consumer starting")
	if err := consumer.Start(ctx); err != nil {
		c.log.Error().Err(err).Msg("catalog consumer exited with error")
	}
}

func (c *CatalogConsumer) handle(body []byte) error {
	var envelope struct {
		Header musicevents.EventHeader `json:"header"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		c.log.Warn().Err(err).Msg("failed to unmarshal event header")
		return nil
	}

	switch envelope.Header.EventType {
	case musicevents.EventTypeTrackPublished:
		return c.handleTrackPublished(body)
	case musicevents.EventTypeTrackUpdated:
		return c.handleTrackUpdated(body)
	case musicevents.EventTypeTrackDeleted:
		return c.handleTrackDeleted(body)
	}
	return nil
}

func (c *CatalogConsumer) handleTrackPublished(body []byte) error {
	var evt musicevents.TrackPublishedEvent
	if err := json.Unmarshal(body, &evt); err != nil {
		c.log.Warn().Err(err).Msg("unmarshal TrackPublishedEvent")
		return nil
	}
	d := evt.Data

	assets := make([]domain.AssetURL, 0, len(d.Assets))
	for _, a := range d.Assets {
		assets = append(assets, domain.AssetURL{Bitrate: a.Bitrate, Format: a.Format, StorageURL: a.StorageURL})
	}
	tc := &domain.TrackCache{
		TrackID:    d.TrackID,
		Title:      d.Title,
		DurationMs: d.DurationMs,
		Genre:      d.Genre,
		ArtistID:   d.ArtistID,
		ArtistName: d.ArtistName,
		CoverURL:   d.CoverURL,
		AssetURLs:  assets,
	}
	if err := c.trackRepo.Upsert(context.Background(), tc); err != nil {
		c.log.Error().Err(err).Str("trackId", d.TrackID).Msg("upsert track_cache (published)")
		return fmt.Errorf("upsert track_cache: %w", err)
	}
	c.log.Info().Str("trackId", d.TrackID).Msg("track_cache updated (published)")
	return nil
}

func (c *CatalogConsumer) handleTrackUpdated(body []byte) error {
	var evt musicevents.TrackUpdatedEvent
	if err := json.Unmarshal(body, &evt); err != nil {
		c.log.Warn().Err(err).Msg("unmarshal TrackUpdatedEvent")
		return nil
	}
	d := evt.Data

	existing, err := c.trackRepo.Get(context.Background(), d.TrackID)
	if err != nil {
		c.log.Debug().Str("trackId", d.TrackID).Msg("track_cache miss on update, skipping")
		return nil
	}

	existing.Title = d.Title
	existing.Genre = d.Genre
	existing.ArtistName = d.ArtistName
	existing.CoverURL = d.CoverURL

	if err := c.trackRepo.Upsert(context.Background(), existing); err != nil {
		c.log.Error().Err(err).Str("trackId", d.TrackID).Msg("upsert track_cache (updated)")
		return fmt.Errorf("upsert track_cache: %w", err)
	}
	c.log.Info().Str("trackId", d.TrackID).Msg("track_cache updated (metadata)")
	return nil
}

func (c *CatalogConsumer) handleTrackDeleted(body []byte) error {
	var evt musicevents.TrackDeletedEvent
	if err := json.Unmarshal(body, &evt); err != nil {
		c.log.Warn().Err(err).Msg("unmarshal TrackDeletedEvent")
		return nil
	}
	if err := c.trackRepo.Delete(context.Background(), evt.Data.TrackID); err != nil {
		c.log.Error().Err(err).Str("trackId", evt.Data.TrackID).Msg("delete track_cache")
		return fmt.Errorf("delete track_cache: %w", err)
	}
	c.log.Info().Str("trackId", evt.Data.TrackID).Msg("track_cache removed (deleted)")
	return nil
}
