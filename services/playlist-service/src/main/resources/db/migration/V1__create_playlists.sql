CREATE SCHEMA IF NOT EXISTS playlist_schema;

CREATE TABLE playlist_schema.playlists (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id          UUID NOT NULL,
    name              VARCHAR(100) NOT NULL,
    description       TEXT,
    visibility        VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    track_count       INTEGER NOT NULL DEFAULT 0,
    total_duration_ms BIGINT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_track_count CHECK (track_count <= 1000)
);

CREATE INDEX idx_playlists_owner ON playlist_schema.playlists (owner_id);
CREATE INDEX idx_playlists_visibility ON playlist_schema.playlists (visibility);
CREATE INDEX idx_playlists_owner_updated ON playlist_schema.playlists (owner_id, updated_at DESC);
