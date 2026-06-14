#!/usr/bin/env bash
# clear-data.sh — Truncates all data across every database in the stack.
# Keeps databases, schemas, indices, buckets, and queues intact.
# Run from the infra/ directory: bash clear-data.sh

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; }

SQL_FILE="$(dirname "$0")/docker/postgres/truncate-all.sql"

echo "======================================================"
echo " Clearing all application data (schemas preserved)"
echo "======================================================"
echo ""

# ── PostgreSQL ──────────────────────────────────────────────────────────────
echo "[1/7] PostgreSQL — truncating all tables in 5 databases (all schemas)..."
for db in user_db catalog_db playlist_db streaming_db upload_db; do
  if docker exec -i music-postgres psql -U music_admin -d "$db" -q < "$SQL_FILE" 2>/dev/null; then
    ok "  $db"
  else
    warn "  $db — no tables yet or already empty"
  fi
done

# ── Neo4j ───────────────────────────────────────────────────────────────────
echo ""
echo "[2/7] Neo4j — deleting all nodes and relationships..."
if docker exec music-neo4j cypher-shell -u neo4j -p music_pass \
  "MATCH (n) DETACH DELETE n" 2>/dev/null; then
  ok "  All nodes and relationships removed"
else
  fail "  Neo4j clear failed"
fi

# ── MongoDB ─────────────────────────────────────────────────────────────────
echo ""
echo "[3/7] MongoDB — dropping all collections in all databases..."
MONGO_SCRIPT='
db.adminCommand({ listDatabases: 1 }).databases.forEach(function(d) {
  if (["admin","local","config"].includes(d.name)) return;
  var targetDb = db.getSiblingDB(d.name);
  targetDb.getCollectionNames().forEach(function(c) {
    targetDb[c].deleteMany({});
    print("  cleared: " + d.name + "." + c);
  });
});
'
if docker exec music-mongodb mongosh -u music_admin -p music_pass --authenticationDatabase admin \
  --quiet --eval "$MONGO_SCRIPT" 2>/dev/null; then
  ok "  Done"
else
  fail "  MongoDB clear failed"
fi

# ── Elasticsearch ───────────────────────────────────────────────────────────
echo ""
echo "[4/7] Elasticsearch — deleting all user indices..."
if docker exec music-elasticsearch \
  curl -sf -X DELETE "http://localhost:9200/*,-.*" -o /dev/null 2>/dev/null; then
  ok "  All user indices deleted"
else
  warn "  No user indices found or already empty"
fi

# ── Redis ───────────────────────────────────────────────────────────────────
echo ""
echo "[5/7] Redis — flushing all keys..."
if docker exec music-redis redis-cli -a music_pass FLUSHALL 2>/dev/null | grep -q OK; then
  ok "  All keys flushed"
else
  fail "  Redis flush failed"
fi

# ── MinIO ───────────────────────────────────────────────────────────────────
echo ""
echo "[6/7] MinIO — removing all objects from buckets (keeping buckets)..."
if docker exec music-minio sh -c "
  mc alias set local http://localhost:9000 music_admin music_pass --quiet 2>/dev/null
  mc rm --recursive --force local/images 2>/dev/null || true
  mc rm --recursive --force local/audio  2>/dev/null || true
" 2>/dev/null; then
  ok "  images/ and audio/ buckets cleared"
else
  warn "  MinIO clear skipped (mc not in main container — use minio-init container)"
  # Fallback: run via a temporary mc container
  docker run --rm --network music-app-network --entrypoint sh \
    minio/mc:latest -c "
      mc alias set local http://music-minio:9000 music_admin music_pass --quiet
      mc rm --recursive --force local/images 2>/dev/null || true
      mc rm --recursive --force local/audio  2>/dev/null || true
    " 2>/dev/null && ok "  images/ and audio/ buckets cleared (via mc container)" \
    || fail "  MinIO clear failed"
fi

# ── RabbitMQ ────────────────────────────────────────────────────────────────
echo ""
echo "[7/7] RabbitMQ — purging all queues in vhost 'music'..."
QUEUES=$(docker exec music-rabbitmq rabbitmqctl list_queues -p music name --quiet 2>/dev/null | awk '{print $1}')
if [ -z "$QUEUES" ]; then
  warn "  No queues found"
else
  for q in $QUEUES; do
    docker exec music-rabbitmq rabbitmqctl purge_queue -p music "$q" --quiet 2>/dev/null && ok "  purged: $q" || warn "  skip: $q"
  done
fi

echo ""
echo "======================================================"
ok "All data cleared. Databases, schemas, and structure preserved."
echo "======================================================"
