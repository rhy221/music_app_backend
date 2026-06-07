package httpadapter

import (
	"net/http"
)

const (
	headerUserID   = "X-User-Id"
	headerUserRole = "X-User-Role"
)

func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get(headerUserID) == "" {
			jsonError(w, http.StatusUnauthorized, "missing authentication headers")
			return
		}
		next(w, r)
	}
}

func requireArtist(next http.HandlerFunc) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		role := r.Header.Get(headerUserRole)
		if role != "ARTIST" && role != "ADMIN" {
			jsonError(w, http.StatusForbidden, "artist role required")
			return
		}
		next(w, r)
	})
}

func userIDFromRequest(r *http.Request) string {
	return r.Header.Get(headerUserID)
}
