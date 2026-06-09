package usecase

import (
	"context"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

type GetDraftUseCase struct {
	drafts port.DraftRepository
}

func NewGetDraft(drafts port.DraftRepository) *GetDraftUseCase {
	return &GetDraftUseCase{drafts: drafts}
}

func (uc *GetDraftUseCase) Execute(ctx context.Context, draftID, uploaderID string) (*domain.UploadDraft, error) {
	return uc.drafts.FindByID(ctx, draftID, uploaderID)
}
