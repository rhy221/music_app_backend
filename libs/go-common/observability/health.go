package observability

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// HealthChecker aggregates named dependency health-check functions.
type HealthChecker struct {
	checks map[string]func(context.Context) error
}

// NewHealthChecker creates an empty HealthChecker.
func NewHealthChecker() *HealthChecker {
	return &HealthChecker{checks: make(map[string]func(context.Context) error)}
}

// AddCheck registers a named health-check function.
func (h *HealthChecker) AddCheck(name string, checker func(context.Context) error) {
	h.checks[name] = checker
}

// Handler returns an http.HandlerFunc that runs all checks and responds with JSON.
// If any check fails the overall status is "DEGRADED" and HTTP 503 is returned.
func (h *HealthChecker) Handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		services := make(map[string]string, len(h.checks))
		healthy := true

		for name, check := range h.checks {
			if err := check(ctx); err != nil {
				services[name] = "DOWN"
				healthy = false
			} else {
				services[name] = "UP"
			}
		}

		status := "UP"
		httpStatus := http.StatusOK
		if !healthy {
			status = "DEGRADED"
			httpStatus = http.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(httpStatus)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":   status,
			"services": services,
		})
	}
}
