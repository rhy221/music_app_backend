SET search_path TO catalog_schema;

CREATE TABLE albums (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id    UUID        NOT NULL REFERENCES artists(id),
    title        VARCHAR(255) NOT NULL,
    cover_url    VARCHAR(512),
    release_date DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_albums_artist_id ON albums (artist_id);
