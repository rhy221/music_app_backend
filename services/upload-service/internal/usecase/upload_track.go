package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	musicevents "music-app/music-events/events"
	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type UploadTrackInput struct {
	UploaderID string
	Title      string
	Genre      *string
	AlbumID    *string
	Filename   string
	SizeBytes  int64
	Content    io.Reader
	RequestID  string
}

type UploadTrackUseCase struct {
	jobs       port.JobRepository
	outbox     port.OutboxRepository
	storage    port.FileStorage
	transactor port.Transactor
}

func NewUploadTrack(jobs port.JobRepository, outbox port.OutboxRepository, storage port.FileStorage, tx port.Transactor) *UploadTrackUseCase {
	return &UploadTrackUseCase{jobs: jobs, outbox: outbox, storage: storage, transactor: tx}
}

func (uc *UploadTrackUseCase) Execute(ctx context.Context, in UploadTrackInput) (*domain.UploadJob, error) {
	jobID := uuid.New().String()

	// Store file first — MinIO is not transactional, so this is outside the DB TX.
	key, err := uc.storage.StoreOriginal(ctx, jobID, in.Filename, in.Content, in.SizeBytes)
	if err != nil {
		return nil, fmt.Errorf("store original: %w", err)
	}

	job := &domain.UploadJob{
		ID:               jobID,
		UploaderID:       in.UploaderID,
		OriginalFilename: in.Filename,
		OriginalSizeBytes: func() *int64 {
			if in.SizeBytes > 0 {
				s := in.SizeBytes
				return &s
			}
			return nil
		}(),
		Title:      in.Title,
		Genre:      in.Genre,
		AlbumID:    in.AlbumID,
		StorageURL: &key,
		Status:     domain.JobStatusUploading,
	}

	// Atomically insert job + outbox event.
	err = uc.transactor.RunInTx(ctx, func(ctx context.Context) error {
		if err := uc.jobs.Insert(ctx, job); err != nil {
			return fmt.Errorf("insert job: %w", err)
		}
		payload, err := json.Marshal(musicevents.TrackUploadedEvent{
			Header: newHeader(musicevents.EventTypeTrackUploaded, in.RequestID),
			Data: musicevents.TrackUploadedData{
				UploadJobID:      jobID,
				UploaderID:       in.UploaderID,
				OriginalFilename: in.Filename,
				Title:            in.Title,
				Genre:            in.Genre,
				StorageURL:       key,
				SizeBytes:        in.SizeBytes,
			},
		})
		if err != nil {
			return fmt.Errorf("marshal event: %w", err)
		}
		return uc.outbox.Insert(ctx, &domain.OutboxEvent{
			ID:         uuid.New().String(),
			EventType:  musicevents.EventTypeTrackUploaded,
			Exchange:   musicevents.Exchanges.Upload,
			RoutingKey: musicevents.RoutingKeys.TrackUploaded,
			Payload:    payload,
			CreatedAt:  time.Now().UTC(),
		})
	})
	if err != nil {
		// Best-effort cleanup of orphaned MinIO object.
		uc.storage.DeleteJobFiles(ctx, jobID)
		return nil, err
	}

	return job, nil
}
