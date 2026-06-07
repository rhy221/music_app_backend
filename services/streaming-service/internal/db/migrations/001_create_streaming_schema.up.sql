-- play_sessions partitioned by month for efficient time-series queries and DROP PARTITION cleanup
CREATE TABLE play_sessions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    track_id    UUID        NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    position_ms INTEGER     NOT NULL DEFAULT 0,
    duration_ms INTEGER     NOT NULL DEFAULT 0,
    completed   BOOLEAN     NOT NULL DEFAULT FALSE,
    status      VARCHAR(20) NOT NULL DEFAULT 'PLAYING',
    source      VARCHAR(30),
    bitrate     INTEGER,
    end_reason  VARCHAR(30)
) PARTITION BY RANGE (started_at);

-- Monthly partitions for 2026
CREATE TABLE play_sessions_2026_06 PARTITION OF play_sessions
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE play_sessions_2026_07 PARTITION OF play_sessions
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE play_sessions_2026_08 PARTITION OF play_sessions
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE play_sessions_2026_09 PARTITION OF play_sessions
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE play_sessions_2026_10 PARTITION OF play_sessions
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE play_sessions_2026_11 PARTITION OF play_sessions
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE play_sessions_2026_12 PARTITION OF play_sessions
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE play_sessions_2027_01 PARTITION OF play_sessions
    FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

-- Catch-all partition for any other dates
CREATE TABLE play_sessions_default PARTITION OF play_sessions DEFAULT;

CREATE INDEX idx_sessions_user     ON play_sessions (user_id, started_at DESC);
CREATE INDEX idx_sessions_track    ON play_sessions (track_id);
CREATE INDEX idx_sessions_completed ON play_sessions (user_id, completed, started_at DESC);

-- Local CQRS read model: synced from events.catalog via RabbitMQ consumer
CREATE TABLE track_cache (
    track_id    UUID         PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    duration_ms INTEGER      NOT NULL,
    genre       VARCHAR(50),
    artist_id   UUID,
    artist_name VARCHAR(100),
    cover_url   VARCHAR(512),
    asset_urls  JSONB        NOT NULL DEFAULT '[]',
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
