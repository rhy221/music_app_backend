package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"music-app/upload-service/internal/domain"
)

type TaskRepo struct {
	pool *pgxpool.Pool
}

func NewTaskRepo(pool *pgxpool.Pool) *TaskRepo {
	return &TaskRepo{pool: pool}
}

func (r *TaskRepo) Insert(ctx context.Context, task *domain.TranscodeTask) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx, `
		INSERT INTO transcode_tasks (id, job_id, target_bitrate, status)
		VALUES ($1, $2, $3, $4)`,
		task.ID, task.JobID, task.TargetBitrate, string(task.Status),
	)
	return err
}

func (r *TaskRepo) UpdateCompleted(ctx context.Context, id, outputURL string, outputSizeBytes int64) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx, `
		UPDATE transcode_tasks
		SET status='COMPLETED', output_url=$1, output_size_bytes=$2,
		    completed_at=NOW(), updated_at=NOW()
		WHERE id=$3`,
		outputURL, outputSizeBytes, id,
	)
	return err
}

func (r *TaskRepo) UpdateFailed(ctx context.Context, id, errMsg string) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx, `
		UPDATE transcode_tasks
		SET status='FAILED', error_message=$1, updated_at=NOW()
		WHERE id=$2`,
		errMsg, id,
	)
	return err
}

func (r *TaskRepo) ResetFailed(ctx context.Context, jobID string) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx, `
		UPDATE transcode_tasks
		SET status='PENDING', error_message=NULL, started_at=NULL, completed_at=NULL, updated_at=NOW()
		WHERE job_id=$1 AND status='FAILED'`,
		jobID,
	)
	return err
}

func (r *TaskRepo) FindByJobID(ctx context.Context, jobID string) ([]domain.TranscodeTask, error) {
	q := db(ctx, r.pool)
	rows, err := q.Query(ctx, `
		SELECT id, job_id, target_bitrate, status, output_url, output_size_bytes,
		       started_at, completed_at, error_message
		FROM transcode_tasks
		WHERE job_id=$1
		ORDER BY target_bitrate`, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []domain.TranscodeTask
	for rows.Next() {
		var t domain.TranscodeTask
		var status string
		if err := rows.Scan(
			&t.ID, &t.JobID, &t.TargetBitrate, &status,
			&t.OutputURL, &t.OutputSizeBytes,
			&t.StartedAt, &t.CompletedAt, &t.ErrorMessage,
		); err != nil {
			return nil, err
		}
		t.Status = domain.TaskStatus(status)
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}
