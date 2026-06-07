package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"music-app/upload-service/internal/domain"
)

type OutboxRepo struct {
	pool *pgxpool.Pool
}

func NewOutboxRepo(pool *pgxpool.Pool) *OutboxRepo {
	return &OutboxRepo{pool: pool}
}

func (r *OutboxRepo) Insert(ctx context.Context, event *domain.OutboxEvent) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx, `
		INSERT INTO outbox_events (id, event_type, exchange, routing_key, payload, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		event.ID, event.EventType, event.Exchange, event.RoutingKey,
		event.Payload, event.CreatedAt,
	)
	return err
}

func (r *OutboxRepo) FetchUnprocessed(ctx context.Context, limit int) ([]domain.OutboxEvent, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, event_type, exchange, routing_key, payload, created_at
		FROM outbox_events
		WHERE processed_at IS NULL
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.OutboxEvent
	for rows.Next() {
		var e domain.OutboxEvent
		if err := rows.Scan(
			&e.ID, &e.EventType, &e.Exchange, &e.RoutingKey,
			&e.Payload, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

func (r *OutboxRepo) MarkProcessed(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE outbox_events SET processed_at=NOW() WHERE id=$1`, id)
	return err
}

func (r *OutboxRepo) MarkFailed(ctx context.Context, id, errMsg string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE outbox_events SET error=$1 WHERE id=$2`, errMsg, id)
	return err
}
