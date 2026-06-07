package usecase

import (
	"context"

	"github.com/rs/zerolog"
	"music-app/streaming-service/internal/domain"
)

// HistoryUseCase retrieves listening history and statistics.
type HistoryUseCase struct {
	sessions domain.SessionRepository
	log      zerolog.Logger
}

func NewHistoryUseCase(sessions domain.SessionRepository, log zerolog.Logger) *HistoryUseCase {
	return &HistoryUseCase{
		sessions: sessions,
		log:      log.With().Str("usecase", "history").Logger(),
	}
}

func (uc *HistoryUseCase) GetHistory(ctx context.Context, userID string, page, size int) ([]domain.HistoryEntry, int64, error) {
	return uc.sessions.GetHistory(ctx, userID, page, size)
}

func (uc *HistoryUseCase) GetRecentlyPlayed(ctx context.Context, userID string, limit int) ([]domain.HistoryEntry, error) {
	return uc.sessions.GetRecentlyPlayed(ctx, userID, limit)
}

func (uc *HistoryUseCase) GetStats(ctx context.Context, userID string) (*domain.ListeningStats, error) {
	return uc.sessions.GetStats(ctx, userID)
}
