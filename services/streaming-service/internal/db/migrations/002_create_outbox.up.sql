CREATE TABLE outbox_events (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type   VARCHAR(100) NOT NULL,
    payload      JSONB        NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    retry_count  INTEGER      NOT NULL DEFAULT 0
);

-- Partial index: only unpublished rows — poller query is always on this subset
CREATE INDEX idx_outbox_pending ON outbox_events (created_at ASC)
    WHERE published_at IS NULL;
