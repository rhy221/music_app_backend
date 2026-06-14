-- Truncate all user tables across all schemas, preserving migration history.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      AND tablename NOT IN ('flyway_schema_history', 'schema_migrations')
  ) LOOP
    EXECUTE 'TRUNCATE TABLE '
      || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename)
      || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;
