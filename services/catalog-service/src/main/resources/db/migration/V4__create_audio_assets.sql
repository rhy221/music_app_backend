SET search_path TO catalog_schema;

CREATE TABLE audio_assets (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id    UUID          NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    bitrate     INTEGER       NOT NULL,
    format      VARCHAR(10)   NOT NULL,
    storage_url VARCHAR(1024) NOT NULL,
    size_bytes  BIGINT        NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_assets_track_bitrate ON audio_assets (track_id, bitrate);
