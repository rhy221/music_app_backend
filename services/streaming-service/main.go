package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func jsonResponse(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func handleStream(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	trackId := parts[len(parts)-1]

	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("X-Track-Id", trackId)
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "mock-audio-stream-for-%s", trackId)
}

func handlePlaySessions(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		jsonResponse(w, http.StatusCreated, map[string]any{
			"sessionId": fmt.Sprintf("session-%d", time.Now().UnixMilli()),
			"trackId":   "track-001",
			"userId":    "user-001",
			"startedAt": time.Now().UTC().Format(time.RFC3339),
			"status":    "ACTIVE",
		})
	default:
		http.NotFound(w, r)
	}
}

func handleHeartbeat(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimSuffix(r.URL.Path, "/heartbeat"), "/")
	sessionId := parts[len(parts)-1]
	jsonResponse(w, http.StatusOK, map[string]any{
		"sessionId": sessionId,
		"position":  30,
		"accepted":  true,
	})
}

func handleEndSession(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimSuffix(r.URL.Path, "/end"), "/")
	sessionId := parts[len(parts)-1]
	jsonResponse(w, http.StatusOK, map[string]any{
		"sessionId":    sessionId,
		"status":       "COMPLETED",
		"duration":     180,
		"completedAt":  time.Now().UTC().Format(time.RFC3339),
	})
}

func handleHistory(w http.ResponseWriter, r *http.Request) {
	if strings.HasSuffix(r.URL.Path, "/recently-played") {
		jsonResponse(w, http.StatusOK, map[string]any{
			"items": []map[string]any{
				{
					"trackId":  "track-001",
					"title":    "Starlight Serenade",
					"artist":   map[string]any{"artistId": "artist-001", "displayName": "Luna Echo"},
					"playedAt": "2024-06-05T07:30:00Z",
				},
			},
			"total": 1,
		})
		return
	}

	if strings.HasSuffix(r.URL.Path, "/stats") {
		jsonResponse(w, http.StatusOK, map[string]any{
			"userId":        "user-001",
			"totalPlayTime": 3600,
			"totalTracks":   42,
			"topGenres":     []string{"POP", "ELECTRONIC", "AMBIENT"},
			"period":        "last_30_days",
		})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"items": []map[string]any{
			{
				"entryId":  "history-001",
				"trackId":  "track-001",
				"title":    "Starlight Serenade",
				"duration": 215,
				"playedAt": "2024-06-05T07:30:00Z",
			},
		},
		"total": 1,
		"page":  0,
		"size":  20,
	})
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/v1/stream/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/hls") {
			trackId := strings.Split(r.URL.Path, "/")[5]
			jsonResponse(w, http.StatusOK, map[string]any{
				"trackId":  trackId,
				"manifest": "#EXTM3U\n#EXT-X-VERSION:3\nmock.m3u8",
			})
			return
		}
		handleStream(w, r)
	})

	mux.HandleFunc("/api/v1/play-sessions", handlePlaySessions)

	mux.HandleFunc("/api/v1/play-sessions/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/heartbeat") {
			handleHeartbeat(w, r)
		} else if strings.HasSuffix(r.URL.Path, "/end") {
			handleEndSession(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/v1/history", handleHistory)
	mux.HandleFunc("/api/v1/history/", handleHistory)

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, http.StatusOK, map[string]any{"status": "ok", "service": "streaming-service"})
	})

	port := "8084"
	fmt.Printf("streaming-service listening on :%s\n", port)
	http.ListenAndServe(":"+port, mux)
}
