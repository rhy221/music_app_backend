package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"

	commonminio "github.com/team/music-app/libs/go-common/minio"
	"github.com/team/music-app/libs/go-common/observability"
	"github.com/team/music-app/libs/go-common/postgres"
	"github.com/team/music-app/libs/go-common/rabbitmq"
	"github.com/team/music-app/libs/go-common/server"
	musicevents "music-app/music-events/events"

	pgadapter "music-app/upload-service/internal/adapter/postgres"
	minioadapter "music-app/upload-service/internal/adapter/minio"
	httpadapter "music-app/upload-service/internal/adapter/http"
	"music-app/upload-service/internal/db"
	"music-app/upload-service/internal/usecase"
	"music-app/upload-service/internal/worker"
)

func main() {
	cfg, err := server.LoadConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	log := observability.NewLogger(cfg.ServiceName)

	// ── Database ──────────────────────────────────────────────────────────────
	pool, err := postgres.NewPool(cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres connect")
	}
	defer pool.Close()

	if err := db.AutoMigrate(context.Background(), pool, log); err != nil {
		log.Fatal().Err(err).Msg("auto migrate")
	}

	// ── MinIO ─────────────────────────────────────────────────────────────────
	mc, err := commonminio.NewMinioClient(cfg.MinioEndpoint, cfg.MinioAccessKey, cfg.MinioSecretKey, cfg.MinioUseSSL)
	if err != nil {
		log.Fatal().Err(err).Msg("minio init")
	}
	fileStorage := minioadapter.NewFileStorage(mc)
	if err := fileStorage.EnsureBuckets(context.Background()); err != nil {
		log.Fatal().Err(err).Msg("ensure minio buckets")
	}

	// ── RabbitMQ ──────────────────────────────────────────────────────────────
	amqpConn, err := rabbitmq.NewConnection(cfg.RabbitURL)
	if err != nil {
		log.Fatal().Err(err).Msg("rabbitmq connect")
	}
	defer amqpConn.Close()

	if err := amqpConn.Channel().ExchangeDeclare(
		musicevents.Exchanges.Upload, "topic", true, false, false, false, nil,
	); err != nil {
		log.Fatal().Err(err).Msg("declare upload exchange")
	}

	// ── Repositories & transactor ─────────────────────────────────────────────
	jobRepo := pgadapter.NewJobRepo(pool)
	taskRepo := pgadapter.NewTaskRepo(pool)
	outboxRepo := pgadapter.NewOutboxRepo(pool)
	draftRepo := pgadapter.NewDraftRepo(pool)
	transactor := pgadapter.NewTransactor(pool)

	// ── Transcoder pool (implements port.Dispatcher) ───────────────────────────
	numWorkers := envInt("TRANSCODE_WORKERS", 3)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	transcoderPool := worker.NewTranscoderPool(numWorkers, jobRepo, taskRepo, outboxRepo, fileStorage, transactor, log)
	transcoderPool.Start(ctx)

	// ── Use cases ─────────────────────────────────────────────────────────────
	createDraftUC := usecase.NewCreateDraft(draftRepo, fileStorage)
	getDraftUC := usecase.NewGetDraft(draftRepo)
	addTrackUC := usecase.NewAddTrack(draftRepo)
	deleteTrackUC := usecase.NewDeleteTrack(draftRepo, fileStorage)
	audioURLUC := usecase.NewGetAudioUploadURL(draftRepo, fileStorage)
	confirmAudioUC := usecase.NewConfirmAudio(draftRepo, fileStorage)
	submitDraftUC := usecase.NewSubmitDraft(draftRepo, jobRepo, outboxRepo, transactor, transcoderPool)
	cancelDraftUC := usecase.NewCancelDraft(draftRepo, fileStorage)

	getJobUC := usecase.NewGetJob(jobRepo, taskRepo)
	listJobsUC := usecase.NewListJobs(jobRepo)
	retryJobUC := usecase.NewRetryJob(jobRepo, taskRepo)
	cancelJobUC := usecase.NewCancelJob(jobRepo, fileStorage)

	// ── Outbox relay ──────────────────────────────────────────────────────────
	relay := worker.NewOutboxRelay(outboxRepo, amqpConn, log)
	go relay.Run(ctx)

	// ── Catalog consumer ──────────────────────────────────────────────────────
	catalogConsumer := worker.NewCatalogConsumer(amqpConn, jobRepo, log)
	if err := catalogConsumer.Setup(); err != nil {
		log.Fatal().Err(err).Msg("catalog consumer setup")
	}
	go catalogConsumer.Start(ctx)

	// ── HTTP mux ──────────────────────────────────────────────────────────────
	mux := http.NewServeMux()
	metrics := observability.SetupMetrics(mux)

	health := observability.NewHealthChecker()
	health.AddCheck("postgres", func(ctx context.Context) error {
		return postgres.Ping(ctx, pool)
	})
	health.AddCheck("minio", func(ctx context.Context) error {
		ok, err := mc.BucketExists(ctx, "images")
		if err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("images bucket missing")
		}
		return nil
	})
	mux.HandleFunc("/health", health.Handler())

	const draftsPrefix = "/api/v1/upload/drafts"
	draftHandler := httpadapter.NewDraftHandler(
		draftsPrefix,
		cfg.JWTSecret,
		createDraftUC, getDraftUC, addTrackUC, deleteTrackUC,
		audioURLUC, confirmAudioUC, submitDraftUC, cancelDraftUC,
	)
	draftHandler.Register(mux)

	jobsHandler := httpadapter.NewJobsHandler(cfg.JWTSecret, listJobsUC, getJobUC, retryJobUC, cancelJobUC)

	jobsHandler.Register(mux, "/api/v1/upload/jobs")

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: metrics.MetricsMiddleware(observability.RequestLogger(log)(mux)),
	}

	log.Info().Str("port", cfg.Port).Int("transcodeWorkers", numWorkers).Msg("upload-service starting")

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

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
