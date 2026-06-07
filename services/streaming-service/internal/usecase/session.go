package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"music-app/streaming-service/internal/domain"
)

// SessionUseCase contains all play session business logic.
type SessionUseCase struct {
	sessions domain.SessionRepository
	tracks   domain.TrackCacheRepository
	catalog  domain.CatalogClient
	events   domain.EventPublisher
	counter  domain.PlayCounter
	log      zerolog.Logger
}

func NewSessionUseCase(
	sessions domain.SessionRepository,
	tracks domain.TrackCacheRepository,
	catalog domain.CatalogClient,
	events domain.EventPublisher,
	counter domain.PlayCounter,
	log zerolog.Logger,
) *SessionUseCase {
	return &SessionUseCase{
		sessions: sessions,
		tracks:   tracks,
		catalog:  catalog,
		events:   events,
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
	newCompleted := session.Completed

	if !session.Completed {
		if tc, err := uc.getOrFetchTrack(ctx, session.TrackID); err == nil {
			if reachedThreshold(newDurationMs, positionMs, tc.DurationMs) {
				newCompleted = true
				uc.onPlayCompleted(ctx, session, tc)
			}
		}
	}

	return uc.sessions.UpdateHeartbeat(ctx, sessionID, positionMs, newDurationMs, newCompleted)
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
	newCompleted := session.Completed

	if !session.Completed {
		if tc, err := uc.getOrFetchTrack(ctx, session.TrackID); err == nil {
			if reachedThreshold(newDurationMs, positionMs, tc.DurationMs) {
				newCompleted = true
				uc.onPlayCompleted(ctx, session, tc)
			}
		}
	}

	if reason == "" {
		reason = string(domain.EndReasonCompleted)
	}
	return uc.sessions.End(ctx, sessionID, positionMs, newDurationMs, newCompleted, reason)
}

// getOrFetchTrack checks the local cache first, then falls back to the Catalog service.
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

// onPlayCompleted fires once per session when the listening threshold is crossed (≥30s or ≥50%).
func (uc *SessionUseCase) onPlayCompleted(ctx context.Context, session *domain.PlaySession, tc *domain.TrackCache) {
	if err := uc.counter.IncrPlayCount(ctx, session.TrackID); err != nil {
		uc.log.Warn().Err(err).Str("trackId", session.TrackID).Msg("incr play count failed")
	}
	if err := uc.events.PublishTrackPlayed(ctx, session, tc); err != nil {
		uc.log.Error().Err(err).Str("sessionId", session.ID).Msg("publish TrackPlayedEvent failed")
	}
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
