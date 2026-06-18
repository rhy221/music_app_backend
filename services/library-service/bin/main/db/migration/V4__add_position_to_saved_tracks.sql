ALTER TABLE library_schema.saved_tracks
    ADD COLUMN position INTEGER;

UPDATE library_schema.saved_tracks s
SET position = sub.rn
FROM (
    SELECT id,
           (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY saved_at ASC) - 1)::INTEGER AS rn
    FROM library_schema.saved_tracks
) sub
WHERE s.id = sub.id;

ALTER TABLE library_schema.saved_tracks
    ALTER COLUMN position SET NOT NULL,
    ALTER COLUMN position SET DEFAULT 0;

DROP INDEX IF EXISTS library_schema.idx_saved_tracks_user;
CREATE INDEX idx_saved_tracks_user ON library_schema.saved_tracks (user_id, position) WHERE NOT deleted;
