CREATE TABLE playlist_schema.collaborators (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id  UUID NOT NULL REFERENCES playlist_schema.playlists(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    role         VARCHAR(20) NOT NULL,
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    display_name VARCHAR(100),
    avatar_url   VARCHAR(512),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_playlist_collaborator UNIQUE (playlist_id, user_id)
);

CREATE INDEX idx_collaborators_playlist ON playlist_schema.collaborators (playlist_id);
CREATE INDEX idx_collaborators_user ON playlist_schema.collaborators (user_id);
