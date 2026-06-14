package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"music-app/upload-service/internal/domain"
)

type DraftRepo struct {
	pool *pgxpool.Pool
}

func NewDraftRepo(pool *pgxpool.Pool) *DraftRepo {
	return &DraftRepo{pool: pool}
}

func (r *DraftRepo) Insert(ctx context.Context, draft *domain.UploadDraft) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx, `
		INSERT INTO upload_drafts (id, uploader_id, release_type, title, genre, thumbnail_url, release_date, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		draft.ID, draft.UploaderID, string(draft.ReleaseType), draft.Title,
		draft.Genre, draft.ThumbnailURL, draft.ReleaseDate, string(draft.Status),
		draft.CreatedAt, draft.UpdatedAt,
	)
	return err
}

func (r *DraftRepo) FindByID(ctx context.Context, id, uploaderID string) (*domain.UploadDraft, error) {
	q := db(ctx, r.pool)
	row := q.QueryRow(ctx, `
		SELECT id, uploader_id, release_type, title, genre, thumbnail_url, release_date, status, created_at, updated_at
		FROM upload_drafts WHERE id = $1 AND uploader_id = $2`, id, uploaderID)

	var d domain.UploadDraft
	var releaseType, status string
	err := row.Scan(
		&d.ID, &d.UploaderID, &releaseType, &d.Title,
		&d.Genre, &d.ThumbnailURL, &d.ReleaseDate, &status, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("%w", domain.ErrNotFound)
		}
		return nil, err
	}
	d.ReleaseType = domain.ReleaseType(releaseType)
	d.Status = domain.DraftStatus(status)

	trackRows, err := q.Query(ctx, `
		SELECT id, draft_id, title, track_number, storage_url, original_filename, size_bytes, created_at
		FROM draft_tracks WHERE draft_id = $1 ORDER BY track_number`, id)
	if err != nil {
		return nil, err
	}
	defer trackRows.Close()

	for trackRows.Next() {
		var t domain.DraftTrack
		if err := trackRows.Scan(
			&t.ID, &t.DraftID, &t.Title, &t.TrackNumber,
			&t.StorageURL, &t.OriginalFilename, &t.SizeBytes, &t.CreatedAt,
		); err != nil {
			return nil, err
		}
		d.Tracks = append(d.Tracks, t)
	}
	if err := trackRows.Err(); err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DraftRepo) UpdateStatus(ctx context.Context, id string, status domain.DraftStatus) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx,
		`UPDATE upload_drafts SET status=$1, updated_at=NOW() WHERE id=$2`,
		string(status), id)
	return err
}

func (r *DraftRepo) UpdateThumbnail(ctx context.Context, id, thumbnailURL string) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx,
		`UPDATE upload_drafts SET thumbnail_url=$1, updated_at=NOW() WHERE id=$2`,
		thumbnailURL, id)
	return err
}

func (r *DraftRepo) InsertTrack(ctx context.Context, track *domain.DraftTrack) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx, `
		INSERT INTO draft_tracks (id, draft_id, title, track_number, storage_url, original_filename, size_bytes, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		track.ID, track.DraftID, track.Title, track.TrackNumber,
		track.StorageURL, track.OriginalFilename, track.SizeBytes, track.CreatedAt,
	)
	return err
}

func (r *DraftRepo) UpdateTrackAudio(ctx context.Context, trackID, storageURL, filename string, sizeBytes int64) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx,
		`UPDATE draft_tracks SET storage_url=$1, original_filename=$2, size_bytes=$3 WHERE id=$4`,
		storageURL, filename, sizeBytes, trackID)
	return err
}

func (r *DraftRepo) DeleteTrack(ctx context.Context, trackID, draftID string) error {
	q := db(ctx, r.pool)
	_, err := q.Exec(ctx,
		`DELETE FROM draft_tracks WHERE id=$1 AND draft_id=$2`,
		trackID, draftID)
	return err
}
