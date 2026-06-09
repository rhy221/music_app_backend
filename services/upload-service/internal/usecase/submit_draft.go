package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	musicevents "music-app/music-events/events"
	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type SubmitDraftUseCase struct {
	drafts     port.DraftRepository
	jobs       port.JobRepository
	outbox     port.OutboxRepository
	transactor port.Transactor
	dispatcher port.Dispatcher
}

func NewSubmitDraft(
	drafts port.DraftRepository,
	jobs port.JobRepository,
	outbox port.OutboxRepository,
	transactor port.Transactor,
	dispatcher port.Dispatcher,
) *SubmitDraftUseCase {
	return &SubmitDraftUseCase{
		drafts:     drafts,
		jobs:       jobs,
		outbox:     outbox,
		transactor: transactor,
		dispatcher: dispatcher,
	}
}

func (uc *SubmitDraftUseCase) Execute(ctx context.Context, draftID, uploaderID string) ([]domain.UploadJob, error) {
	draft, err := uc.drafts.FindByID(ctx, draftID, uploaderID)
	if err != nil {
		return nil, err
	}
	if !draft.CanSubmit() {
		return nil, fmt.Errorf("%w: draft cannot be submitted (wrong status or missing audio)", domain.ErrConflict)
	}

	var albumID *string
	if draft.ReleaseType == domain.ReleaseTypeAlbum {
		id := uuid.New().String()
		albumID = &id
	}

	draftIDCopy := draftID
	var createdJobs []domain.UploadJob
	now := time.Now().UTC()

	for _, track := range draft.Tracks {
		t := track
		jobID := uuid.New().String()
		filename := "source"
		if t.OriginalFilename != nil {
			filename = *t.OriginalFilename
		}
		var sizeBytes *int64
		if t.SizeBytes != nil {
			sizeBytes = t.SizeBytes
		}

		job := domain.UploadJob{
			ID:                jobID,
			UploaderID:        uploaderID,
			OriginalFilename:  filename,
			OriginalSizeBytes: sizeBytes,
			Title:             t.Title,
			Genre:             draft.Genre,
			AlbumID:           albumID,
			StorageURL:        t.StorageURL,
			ThumbnailURL:      draft.ThumbnailURL,
			DraftID:           &draftIDCopy,
			Status:            domain.JobStatusUploading,
			CreatedAt:         now,
			UpdatedAt:         now,
		}

		storageKey := ""
		if t.StorageURL != nil {
			storageKey = *t.StorageURL
		}

		var outboxSizeBytes int64
		if t.SizeBytes != nil {
			outboxSizeBytes = *t.SizeBytes
		}

		payload, err := json.Marshal(musicevents.TrackUploadedEvent{
			Header: newHeader(musicevents.EventTypeTrackUploaded, ""),
			Data: musicevents.TrackUploadedData{
				UploadJobID:      jobID,
				UploaderID:       uploaderID,
				OriginalFilename: filename,
				Title:            t.Title,
				Genre:            draft.Genre,
				StorageURL:       storageKey,
				SizeBytes:        outboxSizeBytes,
			},
		})
		if err != nil {
			return nil, fmt.Errorf("marshal event: %w", err)
		}

		err = uc.transactor.RunInTx(ctx, func(ctx context.Context) error {
			if err := uc.jobs.Insert(ctx, &job); err != nil {
				return fmt.Errorf("insert job: %w", err)
			}
			return uc.outbox.Insert(ctx, &domain.OutboxEvent{
				ID:         uuid.New().String(),
				EventType:  musicevents.EventTypeTrackUploaded,
				Exchange:   musicevents.Exchanges.Upload,
				RoutingKey: musicevents.RoutingKeys.TrackUploaded,
				Payload:    payload,
				CreatedAt:  now,
			})
		})
		if err != nil {
			return nil, fmt.Errorf("persist job for track %s: %w", t.ID, err)
		}

		uc.dispatcher.Submit(port.TranscodeWork{
			JobID:        jobID,
			UploaderID:   uploaderID,
			Title:        t.Title,
			Genre:        draft.Genre,
			AlbumID:      albumID,
			StorageKey:   storageKey,
			ThumbnailURL: draft.ThumbnailURL,
		})

		createdJobs = append(createdJobs, job)
	}

	if err := uc.drafts.UpdateStatus(ctx, draftID, domain.DraftStatusSubmitted); err != nil {
		return nil, fmt.Errorf("mark draft submitted: %w", err)
	}

	return createdJobs, nil
}
