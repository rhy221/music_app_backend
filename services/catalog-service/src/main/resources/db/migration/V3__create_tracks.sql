SET search_path TO catalog_schema;

CREATE TABLE tracks (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id    UUID        NOT NULL REFERENCES artists(id),
    album_id     UUID        REFERENCES albums(id),
    title        VARCHAR(255) NOT NULL,
    duration_ms  INTEGER     NOT NULL,
    genre        VARCHAR(50),
    cover_url    VARCHAR(512),
    waveform_url VARCHAR(512),
    play_count   BIGINT      NOT NULL DEFAULT 0,
    status       VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    release_date DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracks_artist     ON tracks (artist_id);
CREATE INDEX idx_tracks_album      ON tracks (album_id);
CREATE INDEX idx_tracks_genre      ON tracks (genre);
CREATE INDEX idx_tracks_play_count ON tracks (play_count DESC);
CREATE INDEX idx_tracks_created    ON tracks (created_at DESC);
CREATE INDEX idx_tracks_status     ON tracks (status);
