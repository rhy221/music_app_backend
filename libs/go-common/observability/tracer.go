package observability

import (
	"context"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// InitTracer sets up an OpenTelemetry TracerProvider that exports spans via
// OTLP/gRPC. The endpoint is read from the OTEL_EXPORTER_OTLP_ENDPOINT env var
// (default "http://localhost:4317"). If the env var is explicitly set to an
// empty string, tracing is skipped and a no-op shutdown function is returned.
//
// The returned function flushes pending spans and shuts down the provider;
// callers should defer it in main().
func InitTracer(serviceName string) (func(), error) {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		// If the env var is not set at all, use the default.
		// os.Getenv returns "" for both unset and empty, so we check with
		// LookupEnv to distinguish the two cases.
		if _, ok := os.LookupEnv("OTEL_EXPORTER_OTLP_ENDPOINT"); ok {
			// Explicitly set to empty -> graceful degradation, no tracing.
			return func() {}, nil
		}
		endpoint = "http://localhost:4317"
	}

	ctx := context.Background()

	exporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(stripScheme(endpoint)),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		return func() {}, err
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
		),
	)
	if err != nil {
		return func() {}, err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	otel.SetTracerProvider(tp)

	shutdown := func() {
		_ = tp.Shutdown(context.Background())
	}

	return shutdown, nil
}

// stripScheme removes "http://" or "https://" from an endpoint string, since
// the gRPC exporter expects a bare host:port.
func stripScheme(endpoint string) string {
	if len(endpoint) > 7 && endpoint[:7] == "http://" {
		return endpoint[7:]
	}
	if len(endpoint) > 8 && endpoint[:8] == "https://" {
		return endpoint[8:]
	}
	return endpoint
}
