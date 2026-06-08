package event

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/team/music-app/libs/go-common/rabbitmq"
	musicevents "music-app/music-events/events"
	"music-app/streaming-service/internal/domain"
)

const serviceName = "streaming-service"

// RabbitMQEventPublisher implements domain.EventPublisher.
type RabbitMQEventPublisher struct {
	pub *rabbitmq.Publisher
}

func NewRabbitMQEventPublisher(pub *rabbitmq.Publisher) *RabbitMQEventPublisher {
	return &RabbitMQEventPublisher{pub: pub}
}

// PublishTrackPlayed wraps the domain payload in the canonical wire-format event and publishes it.
func (p *RabbitMQEventPublisher) PublishTrackPlayed(_ context.Context, payload domain.TrackPlayedPayload) error {
	evt := musicevents.TrackPlayedEvent{
		Header: musicevents.EventHeader{
			EventID:       uuid.New().String(),
			EventType:     musicevents.EventTypeTrackPlayed,
			Timestamp:     time.Now().UTC(),
			SourceService: serviceName,
		},
		Data: musicevents.TrackPlayedData{
			UserID:        payload.UserID,
			TrackID:       payload.TrackID,
			Genre:         payload.Genre,
			ArtistID:      payload.ArtistID,
			DurationMs:    payload.DurationMs,
			Source:        musicevents.PlaySource(payload.Source),
			CompletedFull: payload.CompletedFull,
			PlayedAt:      payload.PlayedAt,
		},
	}
	return p.pub.Publish(musicevents.Exchanges.Streaming, musicevents.RoutingKeys.TrackPlayed, evt)
}
