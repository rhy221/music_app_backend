CREATE SCHEMA IF NOT EXISTS user_schema;

CREATE TABLE user_schema.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    bio             TEXT,
    avatar_url      VARCHAR(512),
    role            VARCHAR(20)  NOT NULL DEFAULT 'LISTENER',
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON user_schema.users (email);
CREATE INDEX idx_users_role  ON user_schema.users (role);
