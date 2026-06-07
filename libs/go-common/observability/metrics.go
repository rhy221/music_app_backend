package observability

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds Prometheus counters and histograms for HTTP request instrumentation.
type Metrics struct {
	requestsTotal   *prometheus.CounterVec
	requestDuration *prometheus.HistogramVec
}

// SetupMetrics registers default HTTP metrics and mounts /metrics on mux.
func SetupMetrics(mux *http.ServeMux) *Metrics {
	m := &Metrics{
		requestsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_requests_total",
				Help: "Total number of HTTP requests by method, path, and status.",
			},
			[]string{"method", "path", "status"},
		),
		requestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "http_request_duration_seconds",
				Help:    "HTTP request duration in seconds by method and path.",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"method", "path"},
		),
	}
	prometheus.MustRegister(m.requestsTotal, m.requestDuration)
	mux.Handle("/metrics", promhttp.Handler())
	return m
}

// MetricsMiddleware returns an HTTP middleware that records request counts and latency.
func (m *Metrics) MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)
		status := strconv.Itoa(rw.status)
		m.requestsTotal.WithLabelValues(r.Method, r.URL.Path, status).Inc()
		m.requestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(time.Since(start).Seconds())
	})
}
