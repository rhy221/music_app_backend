package usecase

import (
	"context"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type JobDetailOutput struct {
	Job   *domain.UploadJob
	Tasks []domain.TranscodeTask
}

type GetJobUseCase struct {
	jobs  port.JobRepository
	tasks port.TaskRepository
}

func NewGetJob(jobs port.JobRepository, tasks port.TaskRepository) *GetJobUseCase {
	return &GetJobUseCase{jobs: jobs, tasks: tasks}
}

func (uc *GetJobUseCase) Execute(ctx context.Context, jobID, uploaderID string) (*JobDetailOutput, error) {
	job, err := uc.jobs.FindByID(ctx, jobID, uploaderID)
	if err != nil {
		return nil, err
	}
	taskList, err := uc.tasks.FindByJobID(ctx, jobID)
	if err != nil {
		return nil, err
	}
	return &JobDetailOutput{Job: job, Tasks: taskList}, nil
}
