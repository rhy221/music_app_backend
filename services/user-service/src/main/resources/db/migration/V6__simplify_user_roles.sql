UPDATE user_schema.users SET role = 'USER' WHERE role IN ('LISTENER', 'ARTIST');

ALTER TABLE user_schema.users ALTER COLUMN role SET DEFAULT 'USER';
