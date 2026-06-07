package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"music-app/streaming-service/internal/domain"
)

type sessionService interface {
	Start(ctx context.Context, userID, trackID string, bitrate *int, source *string) (*domain.PlaySession, error)
	Heartbeat(ctx context.Context, sessionID, userID string, positionMs int) (*domain.PlaySession, error)
	End(ctx context.Context, sessionID, userID string, positionMs int, reason string) (*domain.PlaySession, error)
}

// SessionHandler manages play session lifecycle.
type SessionHandler struct {
	svc sessionService
	log zerolog.Logger
}

func NewSessionHandler(svc sessionService, log zerolog.Logger) *SessionHandler {
	return &SessionHandler{
		svc: svc,
		log: log.With().Str("handler", "session").Logger(),
	}
}

func (h *SessionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/api/v1/play-sessions":
		h.startSession(w, r)
	case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/heartbeat"):
		h.heartbeat(w, r, pathSegment(r, 4))
	case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/end"):
		h.endSession(w, r, pathSegment(r, 4))
	default:
		http.NotFound(w, r)
	}
}

func (h *SessionHandler) startSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}

	var req struct {
		TrackID string  `json:"trackId"`
		Bitrate *int    `json:"bitrate,omitempty"`
		Source  *string `json:"source,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.TrackID == "" {
		jsonError(w, http.StatusBadRequest, "trackId is required")
		return
	}

	session, err := h.svc.Start(r.Context(), userID, req.TrackID, req.Bitrate, req.Source)
	if err != nil {
		h.log.Error().Err(err).Msg("start session")
		jsonError(w, http.StatusInternalServerError, "failed to start session")
		return
	}

	jsonResponse(w, http.StatusCreated, sessionToDTO(session))
}

func (h *SessionHandler) heartbeat(w http.ResponseWriter, r *http.Request, sessionID string) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}

	var req struct {
		PositionMs int `json:"positionMs"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	session, err := h.svc.Heartbeat(r.Context(), sessionID, userID, req.PositionMs)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			jsonError(w, http.StatusNotFound, "session not found")
		} else {
			h.log.Error().Err(err).Str("sessionId", sessionID).Msg("heartbeat failed")
			jsonError(w, http.StatusInternalServerError, "heartbeat failed")
		}
		return
	}

	jsonResponse(w, http.StatusOK, sessionToDTO(session))
}

func (h *SessionHandler) endSession(w http.ResponseWriter, r *http.Request, sessionID string) {
	userID, ok := requireAuth(w, r)
	if !ok {
		return
	}

	var req struct {
		PositionMs int    `json:"positionMs"`
		Reason     string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	session, err := h.svc.End(r.Context(), sessionID, userID, req.PositionMs, req.Reason)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			jsonError(w, http.StatusNotFound, "session not found")
		} else {
			h.log.Error().Err(err).Str("sessionId", sessionID).Msg("end session failed")
			jsonError(w, http.StatusInternalServerError, "end session failed")
		}
		return
	}

	jsonResponse(w, http.StatusOK, sessionToDTO(session))
}

func sessionToDTO(s *domain.PlaySession) map[string]any {
	dto := map[string]any{
		"id":         s.ID,
		"userId":     s.UserID,
		"trackId":    s.TrackID,
		"startedAt":  s.StartedAt.UTC().Format(time.RFC3339),
		"positionMs": s.PositionMs,
		"durationMs": s.DurationMs,
		"completed":  s.Completed,
		"status":     string(s.Status),
	}
	if s.EndedAt != nil {
		dto["endedAt"] = s.EndedAt.UTC().Format(time.RFC3339)
	}
	if s.Source != nil {
		dto["source"] = *s.Source
	}
	if s.Bitrate != nil {
		dto["bitrate"] = *s.Bitrate
	}
	if s.EndReason != nil {
		dto["endReason"] = *s.EndReason
	}
	return dto
}
