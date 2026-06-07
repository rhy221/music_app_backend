package domain

import "time"

type JobStatus string

const (
	JobStatusUploading   JobStatus = "UPLOADING"
	JobStatusTranscoding JobStatus = "TRANSCODING"
	JobStatusPublishing  JobStatus = "PUBLISHING"
	JobStatusPublished   JobStatus = "PUBLISHED"
	JobStatusFailed      JobStatus = "FAILED"
	JobStatusCancelled   JobStatus = "CANCELLED"
)

type UploadJob struct {
	ID                 string    `json:"id"`
	UploaderID         string    `json:"uploaderId"`
	OriginalFilename   string    `json:"originalFilename"`
	OriginalFormat     *string   `json:"originalFormat,omitempty"`
	OriginalSizeBytes  *int64    `json:"originalSizeBytes,omitempty"`
	OriginalDurationMs *int      `json:"originalDurationMs,omitempty"`
	Title              string    `json:"title"`
	Genre              *string   `json:"genre,omitempty"`
	AlbumID            *string   `json:"albumId,omitempty"`
	StorageURL         *string   `json:"-"`
	WaveformURL        *string   `json:"waveformUrl,omitempty"`
	Status             JobStatus `json:"status"`
	TrackID            *string   `json:"trackId,omitempty"`
	ErrorMessage       *string   `json:"errorMessage,omitempty"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// CanRetry returns true if the job is in a retryable state.
func (j *UploadJob) CanRetry() bool {
	return j.Status == JobStatusFailed
}

// CanCancel returns true if the job has not yet reached a terminal state.
func (j *UploadJob) CanCancel() bool {
	return j.Status != JobStatusPublished && j.Status != JobStatusCancelled
}
