CREATE TABLE IF NOT EXISTS upload_drafts (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id   UUID        NOT NULL,
    release_type  VARCHAR(20) NOT NULL DEFAULT 'SINGLE',
    title         VARCHAR(255) NOT NULL,
    genre         VARCHAR(50),
    thumbnail_url VARCHAR(1024),
    status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS draft_tracks (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id          UUID         NOT NULL REFERENCES upload_drafts(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    track_number      INTEGER      NOT NULL DEFAULT 1,
    storage_url       VARCHAR(1024),
    original_filename VARCHAR(512),
    size_bytes        BIGINT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draft_tracks_draft   ON draft_tracks (draft_id);
CREATE INDEX IF NOT EXISTS idx_upload_drafts_uploader ON upload_drafts (uploader_id, created_at DESC);

ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(1024);
ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS draft_id      UUID;
