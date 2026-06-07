CREATE TABLE IF NOT EXISTS outbox_events (
    id           UUID PRIMARY KEY,
    event_type   VARCHAR(100) NOT NULL,
    exchange     VARCHAR(100) NOT NULL,
    routing_key  VARCHAR(200) NOT NULL,
    payload      JSONB        NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error        TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed
    ON outbox_events (created_at)
    WHERE processed_at IS NULL;
