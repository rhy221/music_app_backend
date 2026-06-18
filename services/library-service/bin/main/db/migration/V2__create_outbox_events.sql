CREATE TABLE library_schema.outbox_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  VARCHAR(100) NOT NULL,
    exchange    VARCHAR(100) NOT NULL,
    routing_key VARCHAR(100) NOT NULL,
    payload     TEXT NOT NULL,
    published   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_unpublished ON library_schema.outbox_events (created_at)
    WHERE NOT published;
