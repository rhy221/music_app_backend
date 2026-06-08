package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"music-app/streaming-service/internal/domain"
)

// PostgresOutboxRepository implements domain.OutboxRepository.
type PostgresOutboxRepository struct {
	pool *pgxpool.Pool
}

func NewOutboxRepository(pool *pgxpool.Pool) *PostgresOutboxRepository {
	return &PostgresOutboxRepository{pool: pool}
}

// FetchPending returns up to limit unpublished events with retry_count < 5, FIFO order.
// Uses FOR UPDATE SKIP LOCKED so concurrent poller instances (horizontal scale) don't double-process.
func (r *PostgresOutboxRepository) FetchPending(ctx context.Context, limit int) ([]domain.OutboxEvent, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, event_type, payload, created_at, retry_count
		FROM outbox_events
		WHERE published_at IS NULL AND retry_count < 5
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("fetch pending outbox: %w", err)
	}
	defer rows.Close()

	var events []domain.OutboxEvent
	for rows.Next() {
		var e domain.OutboxEvent
		if err := rows.Scan(&e.ID, &e.EventType, &e.Payload, &e.CreatedAt, &e.RetryCount); err != nil {
			return nil, fmt.Errorf("scan outbox row: %w", err)
		}
		events = append(events, e)
	}
	return events, nil
}

func (r *PostgresOutboxRepository) MarkPublished(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE outbox_events SET published_at = NOW() WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("mark outbox published: %w", err)
	}
	return nil
}

func (r *PostgresOutboxRepository) IncrRetryCount(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE outbox_events SET retry_count = retry_count + 1 WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("incr outbox retry: %w", err)
	}
	return nil
}
