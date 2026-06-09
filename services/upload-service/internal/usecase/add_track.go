package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type AddTrackInput struct {
	DraftID     string
	UploaderID  string
	Title       string
	TrackNumber int
}

type AddTrackUseCase struct {
	drafts port.DraftRepository
}

func NewAddTrack(drafts port.DraftRepository) *AddTrackUseCase {
	return &AddTrackUseCase{drafts: drafts}
}

func (uc *AddTrackUseCase) Execute(ctx context.Context, in AddTrackInput) (*domain.DraftTrack, error) {
	draft, err := uc.drafts.FindByID(ctx, in.DraftID, in.UploaderID)
	if err != nil {
		return nil, err
	}
	if draft.Status != domain.DraftStatusDraft {
		return nil, fmt.Errorf("%w: draft is no longer editable", domain.ErrConflict)
	}
	if draft.ReleaseType == domain.ReleaseTypeSingle {
		return nil, fmt.Errorf("%w: cannot add tracks to a SINGLE draft", domain.ErrConflict)
	}
	if in.Title == "" {
		return nil, fmt.Errorf("%w: title is required", domain.ErrValidation)
	}
	if in.TrackNumber < 1 {
		in.TrackNumber = len(draft.Tracks) + 1
	}

	track := &domain.DraftTrack{
		ID:          uuid.New().String(),
		DraftID:     in.DraftID,
		Title:       in.Title,
		TrackNumber: in.TrackNumber,
		CreatedAt:   time.Now().UTC(),
	}
	if err := uc.drafts.InsertTrack(ctx, track); err != nil {
		return nil, fmt.Errorf("insert track: %w", err)
	}
	return track, nil
}
