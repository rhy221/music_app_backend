ALTER TABLE playlist_schema.playlist_items
    ADD COLUMN IF NOT EXISTS artist_id  UUID,
    ADD COLUMN IF NOT EXISTS album_id   UUID,
    ADD COLUMN IF NOT EXISTS album_title VARCHAR(255);
