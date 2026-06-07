CREATE TABLE IF NOT EXISTS upload_jobs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id          UUID NOT NULL,
    original_filename    VARCHAR(512) NOT NULL,
    original_format      VARCHAR(20),
    original_size_bytes  BIGINT,
    original_duration_ms INTEGER,
    title                VARCHAR(255) NOT NULL,
    genre                VARCHAR(50),
    album_id             UUID,
    storage_url          VARCHAR(1024),
    waveform_url         VARCHAR(1024),
    status               VARCHAR(20) NOT NULL DEFAULT 'UPLOADING',
    track_id             UUID,
    error_message        TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_uploader ON upload_jobs (uploader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON upload_jobs (status);

CREATE TABLE IF NOT EXISTS transcode_tasks (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id            UUID NOT NULL REFERENCES upload_jobs(id) ON DELETE CASCADE,
    target_bitrate    INTEGER NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    output_url        VARCHAR(1024),
    output_size_bytes BIGINT,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    error_message     TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_job ON transcode_tasks (job_id);
