CREATE SCHEMA IF NOT EXISTS library_schema;

CREATE TABLE library_schema.saved_albums (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    album_id     UUID NOT NULL,
    saved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    album_title  VARCHAR(255),
    cover_url    VARCHAR(512),
    artist_name  VARCHAR(100),
    artist_id    UUID,
    track_count  INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saved_album UNIQUE (user_id, album_id)
);

CREATE INDEX idx_saved_albums_user ON library_schema.saved_albums (user_id, saved_at DESC);

CREATE TABLE library_schema.followed_playlists (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL,
    playlist_id   UUID NOT NULL,
    owner_id      UUID NOT NULL,
    followed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    playlist_name VARCHAR(100),
    cover_url     VARCHAR(512),
    owner_name    VARCHAR(100),
    track_count   INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_followed_playlist UNIQUE (user_id, playlist_id)
);

CREATE INDEX idx_followed_playlists_user ON library_schema.followed_playlists (user_id, followed_at DESC);

CREATE TABLE library_schema.saved_tracks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    track_id     UUID NOT NULL,
    saved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    track_title  VARCHAR(255),
    cover_url    VARCHAR(512),
    artist_name  VARCHAR(100),
    artist_id    UUID,
    duration_ms  INTEGER,
    album_id     UUID,
    album_title  VARCHAR(255),
    deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saved_track UNIQUE (user_id, track_id)
);

CREATE INDEX idx_saved_tracks_user ON library_schema.saved_tracks (user_id, saved_at DESC) WHERE NOT deleted;
