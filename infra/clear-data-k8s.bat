@echo off
setlocal
set NS=music-app
set SQL_FILE=%~dp0docker\postgres\truncate-all.sql

echo ======================================================
echo  Clearing all K8s application data (schemas preserved)
echo ======================================================
echo.

echo [1/7] PostgreSQL -- truncating all tables (all schemas)...
for %%D in (user_db catalog_db playlist_db streaming_db upload_db library_db) do (
    type "%SQL_FILE%" | kubectl exec -n %NS% -i sts/postgres -- psql -U music_admin -d %%D -tA
)
echo Done.

echo.
echo [2/7] Neo4j -- deleting all nodes and relationships...
kubectl exec -n %NS% sts/neo4j -- cypher-shell -u neo4j -p music_pass "MATCH (n) DETACH DELETE n"
echo Done.

echo.
echo [3/7] MongoDB -- clearing all collections...
kubectl exec -n %NS% sts/mongodb -- mongosh -u music_admin -p music_pass --authenticationDatabase admin --quiet --eval "db.adminCommand({ listDatabases: 1 }).databases.forEach(function(d){ if(['admin','local','config'].includes(d.name)) return; var t=db.getSiblingDB(d.name); t.getCollectionNames().forEach(function(c){ t[c].deleteMany({}); print('cleared: '+d.name+'.'+c); }); });"
echo Done.

echo.
echo [4/7] Elasticsearch -- deleting all documents (preserving mappings)...
kubectl exec -n %NS% -c elasticsearch sts/elasticsearch -- curl -sf -X POST "http://localhost:9200/tracks,albums,artists/_delete_by_query?refresh" -H "Content-Type: application/json" -d "{\"query\":{\"match_all\":{}}}"
echo Done.

echo.
echo [5/7] Redis -- flushing all keys...
kubectl exec -n %NS% sts/redis -- redis-cli -a music_pass FLUSHALL
echo Done.

echo.
echo [6/7] MinIO -- removing all objects from buckets...
kubectl run minio-cleanup -n %NS% --rm -i --restart=Never --image=minio/mc:latest --command -- sh -c "mc alias set local http://minio:9000 music_admin music_pass --quiet && mc rm --recursive --force local/images; mc rm --recursive --force local/audio"
echo Done.

echo.
echo [7/7] RabbitMQ -- purging all queues...
for /f "usebackq tokens=1" %%Q in (`kubectl exec -n %NS% sts/rabbitmq -- rabbitmqctl list_queues -p music name --quiet 2^>nul`) do (
    kubectl exec -n %NS% sts/rabbitmq -- rabbitmqctl purge_queue -p music "%%Q" --quiet
    echo   purged: %%Q
)
echo Done.

echo.
echo ======================================================
echo  All K8s data cleared. Structure and schemas preserved.
echo ======================================================
pause
