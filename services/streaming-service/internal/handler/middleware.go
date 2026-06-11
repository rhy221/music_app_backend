package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
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

// requireAuth accepts requests from two sources:
//  1. Gateway-propagated X-User-Id header (trusted from KrakenD)
//  2. Direct Authorization: Bearer token (validated locally)
func requireAuth(jwtSecret string, w http.ResponseWriter, r *http.Request) (string, bool) {
	if userID := r.Header.Get("X-User-Id"); userID != "" {
		return userID, true
	}
	if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := auth.ValidateJWT(token, jwtSecret)
		if err == nil && claims != nil {
			r.Header.Set("X-User-Id", claims.Subject)
			if claims.Role != "" {
				r.Header.Set("X-User-Role", claims.Role)
			}
			return claims.Subject, true
		}
	}
	jsonError(w, http.StatusUnauthorized, "authentication required")
	return "", false
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
