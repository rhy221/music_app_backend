package handler

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"music-app/streaming-service/internal/domain"
)

type historyService interface {
	GetHistory(ctx context.Context, userID string, page, size int) ([]domain.HistoryEntry, int64, error)
	GetRecentlyPlayed(ctx context.Context, userID string, limit int) ([]domain.HistoryEntry, error)
	GetStats(ctx context.Context, userID string) (*domain.ListeningStats, error)
}

// HistoryHandler serves play history endpoints.
type HistoryHandler struct {
	svc       historyService
	log       zerolog.Logger
	jwtSecret string
}

func NewHistoryHandler(svc historyService, log zerolog.Logger, jwtSecret string) *HistoryHandler {
	return &HistoryHandler{
		svc:       svc,
		log:       log.With().Str("handler", "history").Logger(),
		jwtSecret: jwtSecret,
	}
}

func (h *HistoryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case strings.HasSuffix(r.URL.Path, "/recently-played"):
		h.recentlyPlayed(w, r)
	case strings.HasSuffix(r.URL.Path, "/stats"):
		h.stats(w, r)
	default:
		h.history(w, r)
	}
}

func (h *HistoryHandler) history(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(h.jwtSecret, w, r)
	if !ok {
		return
	}

	page, size := parsePagination(r, 20)
	entries, total, err := h.svc.GetHistory(r.Context(), userID, page, size)
	if err != nil {
		h.log.Error().Err(err).Str("userId", userID).Msg("get play history")
		jsonError(w, http.StatusInternalServerError, "failed to fetch history")
		return
	}

	content := make([]map[string]any, 0, len(entries))
	for _, e := range entries {
		item := map[string]any{
			"trackId":    e.Session.TrackID,
			"trackTitle": e.TrackTitle,
			"artistName": e.ArtistName,
			"playedAt":   e.Session.StartedAt.UTC().Format(time.RFC3339),
			"listenedMs": e.Session.DurationMs,
		}
		if e.CoverURL != nil {
			item["coverUrl"] = *e.CoverURL
		}
		if e.Session.EndedAt != nil {
			item["endedAt"] = e.Session.EndedAt.UTC().Format(time.RFC3339)
		}
		content = append(content, item)
	}

	totalPages := int64(1)
	if total > 0 {
		totalPages = (total + int64(size) - 1) / int64(size)
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"content":       content,
		"page":          page,
		"size":          size,
		"totalElements": total,
		"totalPages":    totalPages,
	})
}

func (h *HistoryHandler) recentlyPlayed(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(h.jwtSecret, w, r)
	if !ok {
		return
	}

	entries, err := h.svc.GetRecentlyPlayed(r.Context(), userID, 20)
	if err != nil {
		h.log.Error().Err(err).Str("userId", userID).Msg("get recently played")
		jsonError(w, http.StatusInternalServerError, "failed to fetch recently played")
		return
	}

	items := make([]map[string]any, 0, len(entries))
	for _, e := range entries {
		item := map[string]any{
			"trackId":    e.Session.TrackID,
			"trackTitle": e.TrackTitle,
			"artistName": e.ArtistName,
			"playedAt":   e.Session.StartedAt.UTC().Format(time.RFC3339),
			"listenedMs": e.Session.DurationMs,
		}
		if e.CoverURL != nil {
			item["coverUrl"] = *e.CoverURL
		}
		items = append(items, item)
	}

	jsonResponse(w, http.StatusOK, map[string]any{"items": items})
}

func (h *HistoryHandler) stats(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAuth(h.jwtSecret, w, r)
	if !ok {
		return
	}

	stats, err := h.svc.GetStats(r.Context(), userID)
	if err != nil {
		h.log.Error().Err(err).Str("userId", userID).Msg("get listening stats")
		jsonError(w, http.StatusInternalServerError, "failed to fetch stats")
		return
	}

	jsonResponse(w, http.StatusOK, stats)
}
