CREATE SCHEMA IF NOT EXISTS catalog_schema;

SET search_path TO catalog_schema;

CREATE TABLE artists (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID,
    name        VARCHAR(100) NOT NULL,
    bio         TEXT,
    avatar_url  VARCHAR(512),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artists_user_id ON artists (user_id);
CREATE INDEX idx_artists_name    ON artists (name);
