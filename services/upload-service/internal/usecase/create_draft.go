package usecase

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type CreateDraftInput struct {
	UploaderID        string
	ReleaseType       domain.ReleaseType
	Title             string
	Genre             *string
	ThumbnailFilename string
	ThumbnailReader   io.Reader
	ThumbnailSize     int64
}

type CreateDraftUseCase struct {
	drafts  port.DraftRepository
	storage port.FileStorage
}

func NewCreateDraft(drafts port.DraftRepository, storage port.FileStorage) *CreateDraftUseCase {
	return &CreateDraftUseCase{drafts: drafts, storage: storage}
}

func (uc *CreateDraftUseCase) Execute(ctx context.Context, in CreateDraftInput) (*domain.UploadDraft, error) {
	if in.Title == "" {
		return nil, fmt.Errorf("%w: title is required", domain.ErrValidation)
	}
	if in.ReleaseType == "" {
		in.ReleaseType = domain.ReleaseTypeSingle
	}

	draftID := uuid.New().String()
	now := time.Now().UTC()

	draft := &domain.UploadDraft{
		ID:          draftID,
		UploaderID:  in.UploaderID,
		ReleaseType: in.ReleaseType,
		Title:       in.Title,
		Genre:       in.Genre,
		Status:      domain.DraftStatusDraft,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if in.ThumbnailReader != nil && in.ThumbnailFilename != "" {
		key, err := uc.storage.StoreThumbnail(ctx, draftID, in.ThumbnailFilename, in.ThumbnailReader, in.ThumbnailSize)
		if err != nil {
			return nil, fmt.Errorf("store thumbnail: %w", err)
		}
		draft.ThumbnailURL = &key
	}

	if err := uc.drafts.Insert(ctx, draft); err != nil {
		if draft.ThumbnailURL != nil {
			uc.storage.DeleteDraftThumbnail(ctx, draftID)
		}
		return nil, fmt.Errorf("insert draft: %w", err)
	}

	if in.ReleaseType == domain.ReleaseTypeSingle {
		track := &domain.DraftTrack{
			ID:          uuid.New().String(),
			DraftID:     draftID,
			Title:       in.Title,
			TrackNumber: 1,
			CreatedAt:   now,
		}
		if err := uc.drafts.InsertTrack(ctx, track); err != nil {
			return nil, fmt.Errorf("insert single track: %w", err)
		}
		draft.Tracks = []domain.DraftTrack{*track}
	}

	return draft, nil
}
