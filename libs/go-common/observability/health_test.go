package observability

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthChecker_AllUp(t *testing.T) {
	hc := NewHealthChecker()
	hc.AddCheck("db", func(_ context.Context) error { return nil })
	hc.AddCheck("mq", func(_ context.Context) error { return nil })

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	hc.Handler()(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	var resp map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["status"] != "UP" {
		t.Errorf("expected status UP, got %v", resp["status"])
	}
}

func TestHealthChecker_Degraded(t *testing.T) {
	hc := NewHealthChecker()
	hc.AddCheck("db", func(_ context.Context) error { return errors.New("connection refused") })
	hc.AddCheck("mq", func(_ context.Context) error { return nil })

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	hc.Handler()(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", rr.Code)
	}
	var resp map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["status"] != "DEGRADED" {
		t.Errorf("expected status DEGRADED, got %v", resp["status"])
	}
}

func TestHealthChecker_NoChecks(t *testing.T) {
	hc := NewHealthChecker()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	hc.Handler()(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}
