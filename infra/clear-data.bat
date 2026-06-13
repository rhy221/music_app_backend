@echo off
echo ======================================================
echo  Clearing all application data (schemas preserved)
echo ======================================================
echo.

set TRUNCATE_SQL=DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'TRUNCATE TABLE public.' ^|^| quote_ident(r.tablename) ^|^| ' RESTART IDENTITY CASCADE'; END LOOP; END $$;

:: ── PostgreSQL ─────────────────────────────────────────────────────────────
echo [1/7] PostgreSQL -- truncating all tables...
docker exec music-postgres psql -U music_admin -d user_db     -c "%TRUNCATE_SQL%" -q
docker exec music-postgres psql -U music_admin -d catalog_db  -c "%TRUNCATE_SQL%" -q
docker exec music-postgres psql -U music_admin -d playlist_db -c "%TRUNCATE_SQL%" -q
docker exec music-postgres psql -U music_admin -d streaming_db -c "%TRUNCATE_SQL%" -q
docker exec music-postgres psql -U music_admin -d upload_db   -c "%TRUNCATE_SQL%" -q
echo Done.

:: ── Neo4j ──────────────────────────────────────────────────────────────────
echo.
echo [2/7] Neo4j -- deleting all nodes and relationships...
docker exec music-neo4j cypher-shell -u neo4j -p music_pass "MATCH (n) DETACH DELETE n"
echo Done.

:: ── MongoDB ────────────────────────────────────────────────────────────────
echo.
echo [3/7] MongoDB -- clearing all collections...
docker exec music-mongodb mongosh -u music_admin -p music_pass --authenticationDatabase admin --quiet --eval "db.adminCommand({ listDatabases: 1 }).databases.forEach(function(d){ if(['admin','local','config'].includes(d.name)) return; var t=db.getSiblingDB(d.name); t.getCollectionNames().forEach(function(c){ t[c].deleteMany({}); print('cleared: '+d.name+'.'+c); }); });"
echo Done.

:: ── Elasticsearch ──────────────────────────────────────────────────────────
echo.
echo [4/7] Elasticsearch -- deleting all user indices...
docker exec music-elasticsearch curl -sf -X DELETE "http://localhost:9200/*,-.*"
echo Done.

:: ── Redis ──────────────────────────────────────────────────────────────────
echo.
echo [5/7] Redis -- flushing all keys...
docker exec music-redis redis-cli -a music_pass FLUSHALL
echo Done.

:: ── MinIO ──────────────────────────────────────────────────────────────────
echo.
echo [6/7] MinIO -- removing all objects from buckets...
docker run --rm --network music-app-network --entrypoint sh minio/mc:latest -c "mc alias set local http://music-minio:9000 music_admin music_pass --quiet && mc rm --recursive --force local/images; mc rm --recursive --force local/audio"
echo Done.

:: ── RabbitMQ ───────────────────────────────────────────────────────────────
echo.
echo [7/7] RabbitMQ -- purging all queues...
for /f "usebackq tokens=1" %%Q in (`docker exec music-rabbitmq rabbitmqctl list_queues -p music name --quiet 2^>nul`) do (
    docker exec music-rabbitmq rabbitmqctl purge_queue -p music "%%Q" --quiet
    echo   purged: %%Q
)
echo Done.

echo.
echo ======================================================
echo  All data cleared. Structure and schemas preserved.
echo ======================================================
pause
