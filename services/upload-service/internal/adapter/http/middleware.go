package httpadapter

import (
	"net/http"
	"strings"

	"github.com/team/music-app/libs/go-common/auth"
)

const headerUserID   = "X-User-Id"
const headerUserRole = "X-User-Role"

// requireAuth returns middleware that accepts requests from two sources:
//  1. Gateway-propagated headers (X-User-Id already set by KrakenD)
//  2. Direct Bearer token (validated locally against jwtSecret)
func requireAuth(jwtSecret string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get(headerUserID) != "" {
				next(w, r)
				return
			}
			if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
				token := strings.TrimPrefix(authHeader, "Bearer ")
				claims, err := auth.ValidateJWT(token, jwtSecret)
				if err == nil && claims != nil {
					r.Header.Set(headerUserID, claims.Subject)
					if claims.Role != "" {
						r.Header.Set(headerUserRole, claims.Role)
					}
					next(w, r)
					return
				}
			}
			jsonError(w, http.StatusUnauthorized, "missing authentication headers")
		}
	}
}

func userIDFromRequest(r *http.Request) string {
	return r.Header.Get(headerUserID)
}
