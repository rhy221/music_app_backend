ALTER TABLE upload_jobs DROP COLUMN IF EXISTS draft_id;
ALTER TABLE upload_jobs DROP COLUMN IF EXISTS thumbnail_url;
DROP TABLE IF EXISTS draft_tracks;
DROP TABLE IF EXISTS upload_drafts;
