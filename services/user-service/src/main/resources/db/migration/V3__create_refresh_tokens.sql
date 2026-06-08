CREATE TABLE user_schema.refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES user_schema.users(id) ON DELETE CASCADE,
    token       VARCHAR(512) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Partial index: only index active tokens for fast lookup
CREATE INDEX idx_refresh_tokens_token ON user_schema.refresh_tokens (token) WHERE NOT revoked;
CREATE INDEX idx_refresh_tokens_user  ON user_schema.refresh_tokens (user_id);
