package domain

import "time"

type TaskStatus string

const (
	TaskStatusPending    TaskStatus = "PENDING"
	TaskStatusProcessing TaskStatus = "PROCESSING"
	TaskStatusCompleted  TaskStatus = "COMPLETED"
	TaskStatusFailed     TaskStatus = "FAILED"
)

type TranscodeTask struct {
	ID              string     `json:"id"`
	JobID           string     `json:"jobId,omitempty"`
	TargetBitrate   int        `json:"targetBitrate"`
	Status          TaskStatus `json:"status"`
	OutputURL       *string    `json:"outputUrl,omitempty"`
	OutputSizeBytes *int64     `json:"outputSizeBytes,omitempty"`
	StartedAt       *time.Time `json:"startedAt,omitempty"`
	CompletedAt     *time.Time `json:"completedAt,omitempty"`
	ErrorMessage    *string    `json:"errorMessage,omitempty"`
}
