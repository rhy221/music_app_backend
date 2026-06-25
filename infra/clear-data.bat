@echo off
echo ======================================================
echo  Clearing all application data (schemas preserved)
echo ======================================================
echo.

:: ── PostgreSQL ─────────────────────────────────────────────────────────────
echo [1/7] PostgreSQL -- truncating all tables (all schemas)...
docker exec -i music-postgres psql -U music_admin -d user_db      < docker\postgres\truncate-all.sql
docker exec -i music-postgres psql -U music_admin -d catalog_db   < docker\postgres\truncate-all.sql
docker exec -i music-postgres psql -U music_admin -d playlist_db  < docker\postgres\truncate-all.sql
docker exec -i music-postgres psql -U music_admin -d streaming_db < docker\postgres\truncate-all.sql
docker exec -i music-postgres psql -U music_admin -d upload_db    < docker\postgres\truncate-all.sql
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
echo [4/7] Elasticsearch -- deleting all documents (preserving mappings)...
docker exec music-elasticsearch curl -sf -X POST "http://localhost:9200/tracks,albums,artists/_delete_by_query?refresh" -H "Content-Type: application/json" -d "{\"query\":{\"match_all\":{}}}"
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
