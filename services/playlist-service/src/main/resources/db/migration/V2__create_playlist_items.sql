CREATE TABLE playlist_schema.playlist_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id     UUID NOT NULL REFERENCES playlist_schema.playlists(id) ON DELETE CASCADE,
    track_id        UUID NOT NULL,
    position        INTEGER NOT NULL,
    added_by        UUID NOT NULL,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    track_title     VARCHAR(255),
    track_duration  INTEGER,
    track_cover_url VARCHAR(512),
    artist_name     VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_playlist_track UNIQUE (playlist_id, track_id)
);

CREATE INDEX idx_items_playlist_position ON playlist_schema.playlist_items (playlist_id, position);
CREATE INDEX idx_items_track ON playlist_schema.playlist_items (track_id);
