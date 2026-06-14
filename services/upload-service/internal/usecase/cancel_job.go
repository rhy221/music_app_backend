package usecase

import (
	"context"
	"fmt"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type CancelJobUseCase struct {
	jobs       port.JobRepository
	storage    port.FileStorage
	dispatcher port.Dispatcher
}

func NewCancelJob(jobs port.JobRepository, storage port.FileStorage, dispatcher port.Dispatcher) *CancelJobUseCase {
	return &CancelJobUseCase{jobs: jobs, storage: storage, dispatcher: dispatcher}
}

func (uc *CancelJobUseCase) Execute(ctx context.Context, jobID, uploaderID string) (*domain.UploadJob, error) {
	job, err := uc.jobs.FindByID(ctx, jobID, uploaderID)
	if err != nil {
		return nil, err
	}
	if !job.CanCancel() {
		return nil, fmt.Errorf("%w: job is already in a terminal state", domain.ErrConflict)
	}
	// Signal the transcoder goroutine to kill the running FFmpeg process.
	uc.dispatcher.CancelJob(jobID)
	uc.storage.DeleteJobFiles(ctx, jobID)
	if err := uc.jobs.UpdateStatus(ctx, jobID, domain.JobStatusCancelled, nil); err != nil {
		return nil, fmt.Errorf("update status: %w", err)
	}
	job.Status = domain.JobStatusCancelled
	return job, nil
}
