package usecase

import (
	"context"
	"fmt"
	"path"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type ConfirmAudioUseCase struct {
	drafts  port.DraftRepository
	storage port.FileStorage
}

func NewConfirmAudio(drafts port.DraftRepository, storage port.FileStorage) *ConfirmAudioUseCase {
	return &ConfirmAudioUseCase{drafts: drafts, storage: storage}
}

func (uc *ConfirmAudioUseCase) Execute(ctx context.Context, draftID, trackID, uploaderID, objectKey string) (*domain.UploadDraft, error) {
	draft, err := uc.drafts.FindByID(ctx, draftID, uploaderID)
	if err != nil {
		return nil, err
	}
	if draft.Status != domain.DraftStatusDraft {
		return nil, fmt.Errorf("%w: draft is no longer editable", domain.ErrConflict)
	}

	var found bool
	for _, t := range draft.Tracks {
		if t.ID == trackID {
			found = true
			break
		}
	}
	if !found {
		return nil, fmt.Errorf("%w: track not found", domain.ErrNotFound)
	}

	sizeBytes, err := uc.storage.ObjectSize(ctx, objectKey)
	if err != nil {
		return nil, fmt.Errorf("%w: audio not found in storage (upload may have failed)", domain.ErrConflict)
	}

	filename := path.Base(objectKey)
	if err := uc.drafts.UpdateTrackAudio(ctx, trackID, objectKey, filename, sizeBytes); err != nil {
		return nil, fmt.Errorf("update track audio: %w", err)
	}

	return uc.drafts.FindByID(ctx, draftID, uploaderID)
}
