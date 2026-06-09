package usecase

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

var allowedAudioExts = map[string]bool{
	".mp3":  true,
	".flac": true,
	".wav":  true,
	".aac":  true,
}

type AudioUploadURLResult struct {
	UploadURL string
	ObjectKey string
}

type GetAudioUploadURLUseCase struct {
	drafts  port.DraftRepository
	storage port.FileStorage
}

func NewGetAudioUploadURL(drafts port.DraftRepository, storage port.FileStorage) *GetAudioUploadURLUseCase {
	return &GetAudioUploadURLUseCase{drafts: drafts, storage: storage}
}

func (uc *GetAudioUploadURLUseCase) Execute(ctx context.Context, draftID, trackID, uploaderID, filename string) (*AudioUploadURLResult, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	if !allowedAudioExts[ext] {
		return nil, fmt.Errorf("%w: unsupported audio format; allowed: mp3, flac, wav, aac", domain.ErrValidation)
	}

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

	objectKey := uc.storage.AudioObjectKey(trackID, filename)
	uploadURL, err := uc.storage.PresignedAudioPutURL(ctx, objectKey, 30*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("presign url: %w", err)
	}

	return &AudioUploadURLResult{
		UploadURL: uploadURL,
		ObjectKey: objectKey,
	}, nil
}
