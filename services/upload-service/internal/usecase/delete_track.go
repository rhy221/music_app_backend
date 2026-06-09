package usecase

import (
	"context"
	"fmt"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type DeleteTrackUseCase struct {
	drafts  port.DraftRepository
	storage port.FileStorage
}

func NewDeleteTrack(drafts port.DraftRepository, storage port.FileStorage) *DeleteTrackUseCase {
	return &DeleteTrackUseCase{drafts: drafts, storage: storage}
}

func (uc *DeleteTrackUseCase) Execute(ctx context.Context, draftID, trackID, uploaderID string) error {
	draft, err := uc.drafts.FindByID(ctx, draftID, uploaderID)
	if err != nil {
		return err
	}
	if draft.Status != domain.DraftStatusDraft {
		return fmt.Errorf("%w: draft is no longer editable", domain.ErrConflict)
	}

	var found bool
	for _, t := range draft.Tracks {
		if t.ID == trackID {
			found = true
			if t.StorageURL != nil {
				uc.storage.DeleteJobFiles(ctx, trackID)
			}
			break
		}
	}
	if !found {
		return fmt.Errorf("%w: track not found", domain.ErrNotFound)
	}

	return uc.drafts.DeleteTrack(ctx, trackID, draftID)
}
