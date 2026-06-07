package handler

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/rs/zerolog"
	"music-app/streaming-service/internal/domain"
	"music-app/streaming-service/internal/usecase"
)

type streamService interface {
	GetAudio(ctx context.Context, trackID string, preferredBitrate int, rangeHeader string) (*usecase.AudioResult, error)
	GetHLSPlaylist(ctx context.Context, trackID string) (string, error)
}

// StreamHandler serves audio files and HLS playlists.
type StreamHandler struct {
	svc streamService
	log zerolog.Logger
}

func NewStreamHandler(svc streamService, log zerolog.Logger) *StreamHandler {
	return &StreamHandler{
		svc: svc,
		log: log.With().Str("handler", "stream").Logger(),
	}
}

func (h *StreamHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	trackID := pathSegment(r, 3) // /api/v1/stream/{trackId}[/hls]
	if trackID == "" {
		jsonError(w, http.StatusBadRequest, "trackId required")
		return
	}
	if strings.HasSuffix(r.URL.Path, "/hls") {
		h.handleHLS(w, r, trackID)
		return
	}
	h.handleStream(w, r, trackID)
}

func (h *StreamHandler) handleStream(w http.ResponseWriter, r *http.Request, trackID string) {
	if _, ok := requireAuth(w, r); !ok {
		return
	}

	preferredBitrate := 320
	if v := r.URL.Query().Get("bitrate"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			preferredBitrate = n
		}
	}

	result, err := h.svc.GetAudio(r.Context(), trackID, preferredBitrate, r.Header.Get("Range"))
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			jsonError(w, http.StatusNotFound, "track not found")
		} else if errors.Is(err, domain.ErrRangeNotSatisfiable) {
			w.Header().Set("Content-Range", "bytes */0")
			w.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
		} else {
			h.log.Error().Err(err).Str("trackId", trackID).Msg("stream error")
			jsonError(w, http.StatusInternalServerError, "audio unavailable")
		}
		return
	}
	defer result.Reader.Close()

	contentLength := result.RangeEnd - result.RangeStart + 1
	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", result.RangeStart, result.RangeEnd, result.TotalSize))
	w.Header().Set("Content-Length", strconv.FormatInt(contentLength, 10))

	if result.HasRange {
		w.WriteHeader(http.StatusPartialContent)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	if _, err := io.Copy(w, result.Reader); err != nil {
		h.log.Warn().Err(err).Str("trackId", trackID).Msg("stream copy interrupted")
	}
}

func (h *StreamHandler) handleHLS(w http.ResponseWriter, r *http.Request, trackID string) {
	if _, ok := requireAuth(w, r); !ok {
		return
	}

	playlist, err := h.svc.GetHLSPlaylist(r.Context(), trackID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			jsonError(w, http.StatusNotFound, "track not found")
		} else {
			jsonError(w, http.StatusInternalServerError, "failed to generate playlist")
		}
		return
	}

	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(playlist))
}
