package port

import (
	"context"

	"music-app/upload-service/internal/domain"
)

type JobRepository interface {
	Insert(ctx context.Context, job *domain.UploadJob) error
	FindByID(ctx context.Context, id, uploaderID string) (*domain.UploadJob, error)
	FindByIDAdmin(ctx context.Context, id string) (*domain.UploadJob, error)
	List(ctx context.Context, uploaderID string, status *string, page, size int) ([]domain.UploadJob, int64, error)
	UpdateStatus(ctx context.Context, id string, status domain.JobStatus, errMsg *string) error
	UpdateMetadata(ctx context.Context, id string, durationMs int, format string) error
	UpdateWaveform(ctx context.Context, id, waveformURL string) error
	UpdateThumbnail(ctx context.Context, id, thumbnailURL string) error
	SetPublished(ctx context.Context, id, trackID string) (bool, error)
}

type TaskRepository interface {
	Insert(ctx context.Context, task *domain.TranscodeTask) error
	UpdateCompleted(ctx context.Context, id, outputURL string, outputSizeBytes int64) error
	UpdateFailed(ctx context.Context, id, errMsg string) error
	ResetFailed(ctx context.Context, jobID string) error
	FindByJobID(ctx context.Context, jobID string) ([]domain.TranscodeTask, error)
}

type OutboxRepository interface {
	Insert(ctx context.Context, event *domain.OutboxEvent) error
	FetchUnprocessed(ctx context.Context, limit int) ([]domain.OutboxEvent, error)
	MarkProcessed(ctx context.Context, id string) error
	MarkFailed(ctx context.Context, id, errMsg string) error
}
