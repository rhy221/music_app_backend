// Package auth provides JWT validation and gateway-header parsing utilities.
package auth

import (
	"fmt"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
)

// Claims extends jwt.RegisteredClaims with application-level user fields.
type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// ValidateJWT parses and validates a signed JWT token string.
// Returns Claims on success or an error if the token is invalid or expired.
func ValidateJWT(tokenString, secret string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to parse jwt: %w", err)
	}
	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

// ParseUserFromHeaders reads X-User-Id and X-User-Role headers set by the API Gateway.
// Used by downstream services that trust the gateway's JWT validation.
func ParseUserFromHeaders(r *http.Request) (userId string, role string, err error) {
	userId = r.Header.Get("X-User-Id")
	if userId == "" {
		return "", "", fmt.Errorf("missing X-User-Id header")
	}
	role = r.Header.Get("X-User-Role")
	return userId, role, nil
}
