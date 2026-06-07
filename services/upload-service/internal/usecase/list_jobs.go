package usecase

import (
	"context"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type ListJobsInput struct {
	UploaderID string
	Status     *string
	Page       int
	Size       int
}

type PaginatedJobs struct {
	Content       []domain.UploadJob
	Page          int
	Size          int
	TotalElements int64
	TotalPages    int
}

type ListJobsUseCase struct {
	jobs port.JobRepository
}

func NewListJobs(jobs port.JobRepository) *ListJobsUseCase {
	return &ListJobsUseCase{jobs: jobs}
}

func (uc *ListJobsUseCase) Execute(ctx context.Context, in ListJobsInput) (*PaginatedJobs, error) {
	items, total, err := uc.jobs.List(ctx, in.UploaderID, in.Status, in.Page, in.Size)
	if err != nil {
		return nil, err
	}
	totalPages := int((total + int64(in.Size) - 1) / int64(in.Size))
	return &PaginatedJobs{
		Content:       items,
		Page:          in.Page,
		Size:          in.Size,
		TotalElements: total,
		TotalPages:    totalPages,
	}, nil
}
