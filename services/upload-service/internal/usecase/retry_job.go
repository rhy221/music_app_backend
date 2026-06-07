package usecase

import (
	"context"
	"fmt"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type RetryJobUseCase struct {
	jobs  port.JobRepository
	tasks port.TaskRepository
}

func NewRetryJob(jobs port.JobRepository, tasks port.TaskRepository) *RetryJobUseCase {
	return &RetryJobUseCase{jobs: jobs, tasks: tasks}
}

func (uc *RetryJobUseCase) Execute(ctx context.Context, jobID, uploaderID string) (*domain.UploadJob, error) {
	job, err := uc.jobs.FindByID(ctx, jobID, uploaderID)
	if err != nil {
		return nil, err
	}
	if !job.CanRetry() {
		return nil, fmt.Errorf("%w: only FAILED jobs can be retried", domain.ErrConflict)
	}
	if err := uc.tasks.ResetFailed(ctx, jobID); err != nil {
		return nil, fmt.Errorf("reset tasks: %w", err)
	}
	if err := uc.jobs.UpdateStatus(ctx, jobID, domain.JobStatusTranscoding, nil); err != nil {
		return nil, fmt.Errorf("update status: %w", err)
	}
	job.Status = domain.JobStatusTranscoding
	return job, nil
}
