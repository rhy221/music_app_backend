package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"music-app/upload-service/internal/domain"
)

type JobRepo struct {
	pool *pgxpool.Pool
}

func NewJobRepo(pool *pgxpool.Pool) *JobRepo {
	return &JobRepo{pool: pool}
}

func (r *JobRepo) Insert(ctx context.Context, job *domain.UploadJob) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx, `
		INSERT INTO upload_jobs (
			id, uploader_id, original_filename, original_format, original_size_bytes,
			title, genre, album_id, storage_url, thumbnail_url, draft_id, status, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
		job.ID, job.UploaderID, job.OriginalFilename, job.OriginalFormat,
		job.OriginalSizeBytes, job.Title, job.Genre, job.AlbumID,
		job.StorageURL, job.ThumbnailURL, job.DraftID,
		string(job.Status), job.CreatedAt, job.UpdatedAt,
	)
	return err
}

func (r *JobRepo) FindByID(ctx context.Context, id, uploaderID string) (*domain.UploadJob, error) {
	q := db(ctx, r.pool)
	row := q.QueryRow(ctx, `
		SELECT id, uploader_id, original_filename, original_format, original_size_bytes,
		       original_duration_ms, title, genre, album_id, storage_url,
		       thumbnail_url, draft_id, waveform_url,
		       status, track_id, error_message, created_at, updated_at
		FROM upload_jobs
		WHERE id = $1 AND uploader_id = $2`, id, uploaderID)
	return scanJob(row)
}

func (r *JobRepo) FindByIDAdmin(ctx context.Context, id string) (*domain.UploadJob, error) {
	q := db(ctx, r.pool)
	row := q.QueryRow(ctx, `
		SELECT id, uploader_id, original_filename, original_format, original_size_bytes,
		       original_duration_ms, title, genre, album_id, storage_url,
		       thumbnail_url, draft_id, waveform_url,
		       status, track_id, error_message, created_at, updated_at
		FROM upload_jobs
		WHERE id = $1`, id)
	return scanJob(row)
}

func (r *JobRepo) List(ctx context.Context, uploaderID string, status *string, page, size int) ([]domain.UploadJob, int64, error) {
	q := db(ctx, r.pool)
	offset := (page - 1) * size

	var (
		rows pgx.Rows
		err  error
	)
	if status != nil {
		rows, err = q.Query(ctx, `
			SELECT id, uploader_id, original_filename, original_format, original_size_bytes,
			       original_duration_ms, title, genre, album_id, storage_url,
			       thumbnail_url, draft_id, waveform_url,
			       status, track_id, error_message, created_at, updated_at
			FROM upload_jobs
			WHERE uploader_id = $1 AND status = $2
			ORDER BY created_at DESC
			LIMIT $3 OFFSET $4`, uploaderID, *status, size, offset)
	} else {
		rows, err = q.Query(ctx, `
			SELECT id, uploader_id, original_filename, original_format, original_size_bytes,
			       original_duration_ms, title, genre, album_id, storage_url,
			       thumbnail_url, draft_id, waveform_url,
			       status, track_id, error_message, created_at, updated_at
			FROM upload_jobs
			WHERE uploader_id = $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3`, uploaderID, size, offset)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var jobs []domain.UploadJob
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			return nil, 0, err
		}
		jobs = append(jobs, *job)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	var total int64
	if status != nil {
		err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM upload_jobs WHERE uploader_id=$1 AND status=$2`, uploaderID, *status).Scan(&total)
	} else {
		err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM upload_jobs WHERE uploader_id=$1`, uploaderID).Scan(&total)
	}
	if err != nil {
		return nil, 0, err
	}
	return jobs, total, nil
}

func (r *JobRepo) UpdateStatus(ctx context.Context, id string, status domain.JobStatus, errMsg *string) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx,
		`UPDATE upload_jobs SET status=$1, error_message=$2, updated_at=NOW() WHERE id=$3`,
		string(status), errMsg, id)
	return err
}

func (r *JobRepo) UpdateMetadata(ctx context.Context, id string, durationMs int, format string) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx,
		`UPDATE upload_jobs SET original_duration_ms=$1, original_format=$2, updated_at=NOW() WHERE id=$3`,
		durationMs, format, id)
	return err
}

func (r *JobRepo) UpdateWaveform(ctx context.Context, id, waveformURL string) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx,
		`UPDATE upload_jobs SET waveform_url=$1, updated_at=NOW() WHERE id=$2`,
		waveformURL, id)
	return err
}

func (r *JobRepo) UpdateThumbnail(ctx context.Context, id, thumbnailURL string) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx,
		`UPDATE upload_jobs SET thumbnail_url=$1, updated_at=NOW() WHERE id=$2`,
		thumbnailURL, id)
	return err
}

func (r *JobRepo) SetPublished(ctx context.Context, id, trackID string) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx,
		`UPDATE upload_jobs SET status='PUBLISHED', track_id=$1, updated_at=NOW() WHERE id=$2`,
		trackID, id)
	return err
}

// scanJob works with both pgx.Row and pgx.Rows via the common Scan interface.
type scanner interface {
	Scan(dest ...any) error
}

func scanJob(s scanner) (*domain.UploadJob, error) {
	var j domain.UploadJob
	var status string
	err := s.Scan(
		&j.ID, &j.UploaderID, &j.OriginalFilename, &j.OriginalFormat,
		&j.OriginalSizeBytes, &j.OriginalDurationMs,
		&j.Title, &j.Genre, &j.AlbumID, &j.StorageURL,
		&j.ThumbnailURL, &j.DraftID, &j.WaveformURL,
		&status, &j.TrackID, &j.ErrorMessage,
		&j.CreatedAt, &j.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("%w", domain.ErrNotFound)
		}
		return nil, err
	}
	j.Status = domain.JobStatus(status)
	return &j, nil
}
