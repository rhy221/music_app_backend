-- ============================================================
-- PostgreSQL initialization: create one database per service
-- Runs once on first container start (empty data volume)
-- ============================================================

-- User Service
CREATE DATABASE user_db;
GRANT ALL PRIVILEGES ON DATABASE user_db TO music_admin;

-- Catalog Service
CREATE DATABASE catalog_db;
GRANT ALL PRIVILEGES ON DATABASE catalog_db TO music_admin;

-- Playlist Service
CREATE DATABASE playlist_db;
GRANT ALL PRIVILEGES ON DATABASE playlist_db TO music_admin;

-- Streaming Service
CREATE DATABASE streaming_db;
GRANT ALL PRIVILEGES ON DATABASE streaming_db TO music_admin;

-- Upload & Transcode Service
CREATE DATABASE upload_db;
GRANT ALL PRIVILEGES ON DATABASE upload_db TO music_admin;

-- Library Service
CREATE DATABASE library_db;
GRANT ALL PRIVILEGES ON DATABASE library_db TO music_admin;
