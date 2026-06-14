ALTER TABLE playlist_schema.playlist_items
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
