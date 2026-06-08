package usecase

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"music-app/streaming-service/internal/domain"
)

// SessionUseCase contains all play session business logic.
// RabbitMQ publishing is NOT done here — an OutboxEvent is written atomically
// with the session update; the OutboxPoller handles publishing.
type SessionUseCase struct {
	sessions domain.SessionRepository
	tracks   domain.TrackCacheRepository
	catalog  domain.CatalogClient
	counter  domain.PlayCounter
	log      zerolog.Logger
}

func NewSessionUseCase(
	sessions domain.SessionRepository,
	tracks domain.TrackCacheRepository,
	catalog domain.CatalogClient,
	counter domain.PlayCounter,
	log zerolog.Logger,
) *SessionUseCase {
	return &SessionUseCase{
		sessions: sessions,
		tracks:   tracks,
		catalog:  catalog,
		counter:  counter,
		log:      log.With().Str("usecase", "session").Logger(),
	}
}

func (uc *SessionUseCase) Start(ctx context.Context, userID, trackID string, bitrate *int, source *string) (*domain.PlaySession, error) {
	s := &domain.PlaySession{
		ID:      uuid.New().String(),
		UserID:  userID,
		TrackID: trackID,
		Status:  domain.SessionStatusPlaying,
		Bitrate: bitrate,
		Source:  source,
	}
	if err := uc.sessions.Insert(ctx, s); err != nil {
		return nil, err
	}
	return s, nil
}

func (uc *SessionUseCase) Heartbeat(ctx context.Context, sessionID, userID string, positionMs int) (*domain.PlaySession, error) {
	session, err := uc.sessions.Get(ctx, sessionID, userID)
	if err != nil {
		return nil, err
	}

	delta := positionMs - session.PositionMs
	if delta < 0 {
		delta = 0
	}
	newDurationMs := session.DurationMs + delta

	if !session.Completed {
		if tc, err := uc.getOrFetchTrack(ctx, session.TrackID); err == nil {
			if reachedThreshold(newDurationMs, positionMs, tc.DurationMs) {
				uc.incrPlayCount(ctx, session.TrackID)
				outbox := uc.buildOutboxEvent(session, tc, newDurationMs)
				return uc.sessions.UpdateHeartbeat(ctx, sessionID, positionMs, newDurationMs, true, &outbox)
			}
		}
	}

	return uc.sessions.UpdateHeartbeat(ctx, sessionID, positionMs, newDurationMs, session.Completed, nil)
}

func (uc *SessionUseCase) End(ctx context.Context, sessionID, userID string, positionMs int, reason string) (*domain.PlaySession, error) {
	session, err := uc.sessions.Get(ctx, sessionID, userID)
	if err != nil {
		return nil, err
	}

	delta := positionMs - session.PositionMs
	if delta < 0 {
		delta = 0
	}
	newDurationMs := session.DurationMs + delta

	if reason == "" {
		reason = string(domain.EndReasonCompleted)
	}

	if !session.Completed {
		if tc, err := uc.getOrFetchTrack(ctx, session.TrackID); err == nil {
			if reachedThreshold(newDurationMs, positionMs, tc.DurationMs) {
				uc.incrPlayCount(ctx, session.TrackID)
				outbox := uc.buildOutboxEvent(session, tc, newDurationMs)
				return uc.sessions.End(ctx, sessionID, positionMs, newDurationMs, true, reason, &outbox)
			}
		}
	}

	return uc.sessions.End(ctx, sessionID, positionMs, newDurationMs, session.Completed, reason, nil)
}

// buildOutboxEvent serializes a TrackPlayedPayload into an OutboxEvent.
// The OutboxPoller will later wrap this in a musicevents.TrackPlayedEvent and publish it.
func (uc *SessionUseCase) buildOutboxEvent(session *domain.PlaySession, tc *domain.TrackCache, newDurationMs int) domain.OutboxEvent {
	source := "BROWSE"
	if session.Source != nil {
		source = *session.Source
	}
	payload := domain.TrackPlayedPayload{
		UserID:        session.UserID,
		TrackID:       session.TrackID,
		Genre:         tc.Genre,
		ArtistID:      tc.ArtistID,
		DurationMs:    newDurationMs,
		Source:        source,
		CompletedFull: newDurationMs >= tc.DurationMs,
		PlayedAt:      session.StartedAt,
	}
	payloadJSON, _ := json.Marshal(payload)
	return domain.OutboxEvent{
		ID:        uuid.New().String(),
		EventType: "TrackPlayed",
		Payload:   payloadJSON,
	}
}

// incrPlayCount increments the Redis play counter; failures are logged and swallowed.
func (uc *SessionUseCase) incrPlayCount(ctx context.Context, trackID string) {
	if err := uc.counter.IncrPlayCount(ctx, trackID); err != nil {
		uc.log.Warn().Err(err).Str("trackId", trackID).Msg("redis incr play count failed (best-effort)")
	}
}

func (uc *SessionUseCase) getOrFetchTrack(ctx context.Context, trackID string) (*domain.TrackCache, error) {
	tc, err := uc.tracks.Get(ctx, trackID)
	if err == nil {
		return tc, nil
	}
	tc, err = uc.catalog.GetTrack(ctx, trackID)
	if err != nil {
		return nil, err
	}
	_ = uc.tracks.Upsert(ctx, tc)
	return tc, nil
}

// reachedThreshold returns true if ≥30s have been listened OR position ≥50% of track duration.
func reachedThreshold(durationMs, positionMs, trackDurationMs int) bool {
	if durationMs >= 30000 {
		return true
	}
	if trackDurationMs > 0 && positionMs >= trackDurationMs/2 {
		return true
	}
	return false
}
