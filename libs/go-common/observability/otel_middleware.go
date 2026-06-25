package observability

import (
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// OtelMiddleware returns an HTTP middleware that creates OpenTelemetry spans
// for each incoming request. It wraps the provided handler with otelhttp so
// that trace context is automatically extracted from incoming headers and
// propagated downstream.
func OtelMiddleware(next http.Handler) http.Handler {
	return otelhttp.NewHandler(next, "http.request")
}
