package port

import (
	"context"

	"music-app/upload-service/internal/domain"
)

type DraftRepository interface {
	Insert(ctx context.Context, draft *domain.UploadDraft) error
	FindByID(ctx context.Context, id, uploaderID string) (*domain.UploadDraft, error)
	UpdateStatus(ctx context.Context, id string, status domain.DraftStatus) error
	UpdateThumbnail(ctx context.Context, id, thumbnailURL string) error
	InsertTrack(ctx context.Context, track *domain.DraftTrack) error
	UpdateTrackAudio(ctx context.Context, trackID, storageURL, filename string, sizeBytes int64) error
	DeleteTrack(ctx context.Context, trackID, draftID string) error
}
