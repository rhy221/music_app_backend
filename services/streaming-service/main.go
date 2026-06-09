package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	commonminio "github.com/team/music-app/libs/go-common/minio"
	"github.com/team/music-app/libs/go-common/observability"
	"github.com/team/music-app/libs/go-common/postgres"
	commonredis "github.com/team/music-app/libs/go-common/redis"
	"github.com/team/music-app/libs/go-common/rabbitmq"
	"github.com/team/music-app/libs/go-common/server"
	musicevents "music-app/music-events/events"
	infracatalog "music-app/streaming-service/internal/infrastructure/catalog"
	infraevent "music-app/streaming-service/internal/infrastructure/event"
	inframinio "music-app/streaming-service/internal/infrastructure/minio"
	infraredis "music-app/streaming-service/internal/infrastructure/redis"
	"music-app/streaming-service/internal/db"
	"music-app/streaming-service/internal/handler"
	"music-app/streaming-service/internal/repository"
	"music-app/streaming-service/internal/usecase"
)

func main() {
	// ── Config ────────────────────────────────────────────────────────────────
	cfg, err := server.LoadConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	redisURL := getEnv("REDIS_URL", "localhost:6379")
	catalogURL := getEnv("CATALOG_SERVICE_URL", "http://localhost:8082")

	log := observability.NewLogger(cfg.ServiceName)

	// ── PostgreSQL ────────────────────────────────────────────────────────────
	pool, err := postgres.NewPool(cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to postgres")
	}
	defer pool.Close()

	if err := db.AutoMigrate(context.Background(), pool, log); err != nil {
		log.Fatal().Err(err).Msg("auto migrate")
	}

	// ── Redis ─────────────────────────────────────────────────────────────────
	redisClient, err := commonredis.NewClient(redisURL)
	if err != nil {
		log.Fatal().Err(err).Str("addr", redisURL).Msg("failed to connect to redis")
	}
	defer redisClient.Close()

	// ── MinIO ─────────────────────────────────────────────────────────────────
	mc, err := commonminio.NewMinioClient(cfg.MinioEndpoint, cfg.MinioAccessKey, cfg.MinioSecretKey, cfg.MinioUseSSL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create minio client")
	}

	// ── RabbitMQ ──────────────────────────────────────────────────────────────
	amqpConn, err := rabbitmq.NewConnection(cfg.RabbitURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to rabbitmq")
	}
	defer amqpConn.Close()

	pub := rabbitmq.NewPublisher(amqpConn)

	if err := amqpConn.Channel().ExchangeDeclare(
		musicevents.Exchanges.Streaming, "topic", true, false, false, false, nil,
	); err != nil {
		log.Fatal().Err(err).Msg("failed to declare streaming exchange")
	}

	// ── Repositories ──────────────────────────────────────────────────────────
	sessionRepo := repository.NewSessionRepository(pool)
	trackCacheRepo := repository.NewTrackCacheRepository(pool)
	outboxRepo := repository.NewOutboxRepository(pool)

	// ── Infrastructure adapters ───────────────────────────────────────────────
	audioStore := inframinio.NewAudioStore(mc)
	catalogClient := infracatalog.NewHTTPCatalogClient(catalogURL)
	eventPublisher := infraevent.NewRabbitMQEventPublisher(pub)
	playCounter := infraredis.NewPlayCounter(redisClient)

	// ── Catalog event consumer ────────────────────────────────────────────────
	catalogConsumer := infraevent.NewCatalogConsumer(amqpConn, trackCacheRepo, log)
	if err := catalogConsumer.Setup(); err != nil {
		log.Fatal().Err(err).Msg("failed to setup catalog consumer")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go catalogConsumer.Start(ctx)

	// ── Outbox poller ─────────────────────────────────────────────────────────
	outboxPoller := infraevent.NewOutboxPoller(outboxRepo, eventPublisher, log)
	go outboxPoller.Start(ctx)

	// ── Use cases ─────────────────────────────────────────────────────────────
	streamUC := usecase.NewStreamUseCase(trackCacheRepo, catalogClient, audioStore, log)
	sessionUC := usecase.NewSessionUseCase(sessionRepo, trackCacheRepo, catalogClient, playCounter, log)
	historyUC := usecase.NewHistoryUseCase(sessionRepo, log)

	// ── HTTP mux ──────────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	metrics := observability.SetupMetrics(mux)

	health := observability.NewHealthChecker()
	health.AddCheck("postgres", func(ctx context.Context) error {
		return postgres.Ping(ctx, pool)
	})
	health.AddCheck("redis", func(ctx context.Context) error {
		return commonredis.Ping(ctx, redisClient)
	})
	health.AddCheck("minio", func(ctx context.Context) error {
		_, err := mc.BucketExists(ctx, "audio-transcoded")
		return err
	})
	mux.HandleFunc("/health", health.Handler())

	chain := func(h http.Handler) http.Handler {
		return metrics.MetricsMiddleware(observability.RequestLogger(log)(h))
	}

	mux.Handle("/api/v1/stream/", chain(handler.NewStreamHandler(streamUC, log)))
	mux.Handle("/api/v1/play-sessions", chain(handler.NewSessionHandler(sessionUC, log)))
	mux.Handle("/api/v1/play-sessions/", chain(handler.NewSessionHandler(sessionUC, log)))
	mux.Handle("/api/v1/history", chain(handler.NewHistoryHandler(historyUC, log)))
	mux.Handle("/api/v1/history/", chain(handler.NewHistoryHandler(historyUC, log)))

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	log.Info().
		Str("port", cfg.Port).
		Str("catalogURL", catalogURL).
		Str("redisURL", redisURL).
		Msg("streaming-service starting")

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	server.GracefulShutdown(srv, func() {
		cancel()
		log.Info().Msg("cleanup complete")
	})
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
