package usecase

import (
	"context"
	"fmt"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type CancelDraftUseCase struct {
	drafts  port.DraftRepository
	storage port.FileStorage
}

func NewCancelDraft(drafts port.DraftRepository, storage port.FileStorage) *CancelDraftUseCase {
	return &CancelDraftUseCase{drafts: drafts, storage: storage}
}

func (uc *CancelDraftUseCase) Execute(ctx context.Context, draftID, uploaderID string) error {
	draft, err := uc.drafts.FindByID(ctx, draftID, uploaderID)
	if err != nil {
		return err
	}
	if !draft.CanCancel() {
		return fmt.Errorf("%w: only DRAFT status can be cancelled", domain.ErrConflict)
	}

	if err := uc.drafts.UpdateStatus(ctx, draftID, domain.DraftStatusCancelled); err != nil {
		return fmt.Errorf("update status: %w", err)
	}

	if draft.ThumbnailURL != nil {
		uc.storage.DeleteDraftThumbnail(ctx, draftID)
	}
	for _, t := range draft.Tracks {
		if t.StorageURL != nil {
			uc.storage.DeleteJobFiles(ctx, t.ID)
		}
	}

	return nil
}
