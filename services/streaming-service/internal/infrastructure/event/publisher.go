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

// PublishTrackPlayed fires when a play session reaches the completion threshold (≥30s or ≥50%).
func (p *RabbitMQEventPublisher) PublishTrackPlayed(_ context.Context, session *domain.PlaySession, track *domain.TrackCache) error {
	source := musicevents.PlaySourceBrowse
	if session.Source != nil {
		source = musicevents.PlaySource(*session.Source)
	}

	evt := musicevents.TrackPlayedEvent{
		Header: musicevents.EventHeader{
			EventID:       uuid.New().String(),
			EventType:     musicevents.EventTypeTrackPlayed,
			Timestamp:     time.Now().UTC(),
			SourceService: serviceName,
		},
		Data: musicevents.TrackPlayedData{
			UserID:        session.UserID,
			TrackID:       session.TrackID,
			Genre:         track.Genre,
			ArtistID:      track.ArtistID,
			DurationMs:    session.DurationMs,
			Source:        source,
			CompletedFull: session.DurationMs >= track.DurationMs,
			PlayedAt:      session.StartedAt,
		},
	}
	return p.pub.Publish(musicevents.Exchanges.Streaming, musicevents.RoutingKeys.TrackPlayed, evt)
}
