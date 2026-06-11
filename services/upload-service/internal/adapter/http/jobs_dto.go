package httpadapter

import (
	"time"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/usecase"
)

type jobSummaryResponse struct {
	ID               string    `json:"id"`
	DraftID          *string   `json:"draftId,omitempty"`
	TrackTitle       string    `json:"trackTitle"`
	Status           string    `json:"status"`
	OriginalFilename string    `json:"originalFilename"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type taskSummaryResponse struct {
	ID           string  `json:"id"`
	Bitrate      int     `json:"bitrate"`
	Status       string  `json:"status"`
	ErrorMessage *string `json:"errorMessage,omitempty"`
}

type jobDetailResponse struct {
	ID                string                `json:"id"`
	DraftID           *string               `json:"draftId,omitempty"`
	TrackTitle        string                `json:"trackTitle"`
	Status            string                `json:"status"`
	OriginalFilename  string                `json:"originalFilename"`
	OriginalFormat    *string               `json:"originalFormat,omitempty"`
	OriginalSizeBytes *int64                `json:"originalSizeBytes,omitempty"`
	CreatedAt         time.Time             `json:"createdAt"`
	UpdatedAt         time.Time             `json:"updatedAt"`
	Tasks             []taskSummaryResponse `json:"tasks"`
}

type paginatedJobsResponse struct {
	Content       []jobSummaryResponse `json:"content"`
	Page          int                  `json:"page"`
	Size          int                  `json:"size"`
	TotalElements int64                `json:"totalElements"`
	TotalPages    int                  `json:"totalPages"`
}

func toJobSummary(j domain.UploadJob) jobSummaryResponse {
	return jobSummaryResponse{
		ID:               j.ID,
		DraftID:          j.DraftID,
		TrackTitle:       j.Title,
		Status:           string(j.Status),
		OriginalFilename: j.OriginalFilename,
		CreatedAt:        j.CreatedAt,
		UpdatedAt:        j.UpdatedAt,
	}
}

func toTaskSummary(t domain.TranscodeTask) taskSummaryResponse {
	return taskSummaryResponse{
		ID:           t.ID,
		Bitrate:      t.TargetBitrate,
		Status:       string(t.Status),
		ErrorMessage: t.ErrorMessage,
	}
}

func toJobDetail(out *usecase.JobDetailOutput) jobDetailResponse {
	j := out.Job
	tasks := make([]taskSummaryResponse, len(out.Tasks))
	for i, t := range out.Tasks {
		tasks[i] = toTaskSummary(t)
	}
	return jobDetailResponse{
		ID:                j.ID,
		DraftID:           j.DraftID,
		TrackTitle:        j.Title,
		Status:            string(j.Status),
		OriginalFilename:  j.OriginalFilename,
		OriginalFormat:    j.OriginalFormat,
		OriginalSizeBytes: j.OriginalSizeBytes,
		CreatedAt:         j.CreatedAt,
		UpdatedAt:         j.UpdatedAt,
		Tasks:             tasks,
	}
}

func toPaginatedJobs(p *usecase.PaginatedJobs) paginatedJobsResponse {
	content := make([]jobSummaryResponse, len(p.Content))
	for i, j := range p.Content {
		content[i] = toJobSummary(j)
	}
	return paginatedJobsResponse{
		Content:       content,
		Page:          p.Page,
		Size:          p.Size,
		TotalElements: p.TotalElements,
		TotalPages:    p.TotalPages,
	}
}
