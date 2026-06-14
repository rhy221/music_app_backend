ALTER TABLE library_schema.followed_playlists
    ADD CONSTRAINT chk_no_self_follow CHECK (owner_id <> user_id);
