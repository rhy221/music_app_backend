package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-secret-key-1234567890abcdef"

func makeToken(t *testing.T, userID, role string, exp time.Duration) string {
	t.Helper()
	claims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(exp)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(testSecret))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}
	return signed
}

func TestValidateJWT_ValidToken(t *testing.T) {
	signed := makeToken(t, "user-123", "USER", time.Hour)
	got, err := ValidateJWT(signed, testSecret)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.UserID != "user-123" {
		t.Errorf("expected UserID user-123, got %s", got.UserID)
	}
	if got.Role != "USER" {
		t.Errorf("expected Role USER, got %s", got.Role)
	}
}

func TestValidateJWT_ExpiredToken(t *testing.T) {
	signed := makeToken(t, "user-123", "USER", -time.Hour)
	_, err := ValidateJWT(signed, testSecret)
	if err == nil {
		t.Fatal("expected error for expired token")
	}
}

func TestValidateJWT_WrongSecret(t *testing.T) {
	claims := &Claims{
		UserID: "user-123",
		Role:   "USER",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte("other-secret"))

	_, err := ValidateJWT(signed, testSecret)
	if err == nil {
		t.Fatal("expected error for wrong secret")
	}
}

func TestValidateJWT_InvalidToken(t *testing.T) {
	_, err := ValidateJWT("not.a.jwt", testSecret)
	if err == nil {
		t.Fatal("expected error for malformed token")
	}
}

func TestParseUserFromHeaders_Valid(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-User-Id", "user-42")
	req.Header.Set("X-User-Role", "ADMIN")

	userID, role, err := ParseUserFromHeaders(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if userID != "user-42" {
		t.Errorf("expected user-42, got %s", userID)
	}
	if role != "ADMIN" {
		t.Errorf("expected ADMIN, got %s", role)
	}
}

func TestParseUserFromHeaders_MissingHeader(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	_, _, err := ParseUserFromHeaders(req)
	if err == nil {
		t.Fatal("expected error when X-User-Id is missing")
	}
}
