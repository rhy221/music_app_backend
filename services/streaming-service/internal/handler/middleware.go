package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/team/music-app/libs/go-common/auth"
)

func jsonResponse(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, map[string]any{
		"status":    status,
		"error":     http.StatusText(status),
		"message":   message,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// requireAuth extracts the authenticated user ID from Gateway-forwarded headers.
// Writes 401 and returns ("", false) if the request is unauthenticated.
func requireAuth(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID, _, err := auth.ParseUserFromHeaders(r)
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "authentication required")
		return "", false
	}
	return userID, true
}

// parsePagination reads ?page and ?size query params with sensible defaults.
func parsePagination(r *http.Request, defaultSize int) (page, size int) {
	page = 0
	size = defaultSize
	if v := r.URL.Query().Get("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			page = n
		}
	}
	if v := r.URL.Query().Get("size"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			size = n
		}
	}
	return
}

// pathSegment returns the URL path segment at the given 0-based index after splitting by "/".
// e.g. /api/v1/play-sessions/abc/heartbeat → index 4 → "abc"
func pathSegment(r *http.Request, index int) string {
	segments := splitPath(r.URL.Path)
	if index < len(segments) {
		return segments[index]
	}
	return ""
}

func splitPath(path string) []string {
	var parts []string
	start := 0
	for i := 0; i < len(path); i++ {
		if path[i] == '/' {
			if i > start {
				parts = append(parts, path[start:i])
			}
			start = i + 1
		}
	}
	if start < len(path) {
		parts = append(parts, path[start:])
	}
	return parts
}
