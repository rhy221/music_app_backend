// Package observability provides logging, metrics, and health-check utilities.
package observability

import (
	"io"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// NewLogger creates a zerolog.Logger with JSON output, timestamp, and a service field.
// Log level is read from LOG_LEVEL env var (defaults to info).
// If LOGSTASH_HOST is set (e.g. "localhost:5044"), logs are also shipped via TCP.
func NewLogger(serviceName string) zerolog.Logger {
	level, err := zerolog.ParseLevel(os.Getenv("LOG_LEVEL"))
	if err != nil {
		level = zerolog.InfoLevel
	}

	var writers []io.Writer
	writers = append(writers, os.Stdout)

	if host := os.Getenv("LOGSTASH_HOST"); host != "" {
		writers = append(writers, newLogstashWriter(host, 1024))
	}

	return zerolog.New(io.MultiWriter(writers...)).
		Level(level).
		With().
		Timestamp().
		Str("service", serviceName).
		Logger()
}

// RequestLogger returns an HTTP middleware that logs method, path, status, latency, and request ID.
// It reads X-Request-Id from the incoming request; if absent, it generates a UUID.
func RequestLogger(logger zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			reqID := r.Header.Get("X-Request-Id")
			if reqID == "" {
				reqID = uuid.New().String()
			}

			rw := &responseRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rw, r)

			logger.Info().
				Str("request_id", reqID).
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", rw.status).
				Dur("latency", time.Since(start)).
				Msg("request")
		})
	}
}

// responseRecorder captures the HTTP status code written by a handler.
type responseRecorder struct {
	http.ResponseWriter
	status int
}

func (r *responseRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}
