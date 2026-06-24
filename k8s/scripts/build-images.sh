#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Music App - Build Docker Images ==="
echo "Repo root: $REPO_ROOT"
echo ""

# ------------------------------------------------------------------
# 1. Configure Docker to use minikube's daemon
# ------------------------------------------------------------------
echo "[..] Configuring Docker to use minikube's daemon..."
eval $(minikube docker-env)
echo "[OK] Docker environment configured."
echo ""

# ------------------------------------------------------------------
# 2. Build all service images
# ------------------------------------------------------------------

# Gateway (self-contained context)
echo "[..] Building music-app/gateway:latest ..."
docker build -t music-app/gateway:latest \
  -f "$REPO_ROOT/services/gateway/Dockerfile" \
  "$REPO_ROOT/services/gateway/"

# Java services (need repo root for gradlew, libs/, services/)
for svc in user-service catalog-service playlist-service library-service; do
  echo "[..] Building music-app/${svc}:latest ..."
  docker build -t "music-app/${svc}:latest" \
    -f "$REPO_ROOT/services/${svc}/Dockerfile" \
    "$REPO_ROOT"
done

# Go services (need repo root for go.work, libs/, services/)
for svc in streaming-service upload-service; do
  echo "[..] Building music-app/${svc}:latest ..."
  docker build -t "music-app/${svc}:latest" \
    -f "$REPO_ROOT/services/${svc}/Dockerfile" \
    "$REPO_ROOT"
done

# Node services (need repo root for package.json, pnpm-lock.yaml, libs/, services/)
for svc in search-service notification-service; do
  echo "[..] Building music-app/${svc}:latest ..."
  docker build -t "music-app/${svc}:latest" \
    -f "$REPO_ROOT/services/${svc}/Dockerfile" \
    "$REPO_ROOT"
done

# Python service (needs repo root for libs/events/python/)
echo "[..] Building music-app/recommend-service:latest ..."
docker build -t music-app/recommend-service:latest \
  -f "$REPO_ROOT/services/recommend-service/Dockerfile" \
  "$REPO_ROOT"

echo ""
echo "=== All 10 images built successfully ==="
docker images --filter "reference=music-app/*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
echo ""
