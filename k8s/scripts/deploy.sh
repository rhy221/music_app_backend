#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Music App - Deploy to Minikube ==="
echo ""

# ------------------------------------------------------------------
# 1. Check minikube is running
# ------------------------------------------------------------------
if ! minikube status --format='{{.Host}}' 2>/dev/null | grep -q "Running"; then
  echo "ERROR: Minikube is not running."
  echo "Run ./k8s/scripts/setup-minikube.sh first."
  exit 1
fi
echo "[OK] Minikube is running."

# ------------------------------------------------------------------
# 2. Build images
# ------------------------------------------------------------------
echo "[..] Building Docker images..."
"$SCRIPT_DIR/build-images.sh"
echo "[OK] Images built."

# ------------------------------------------------------------------
# 3. Deploy with Helm
# ------------------------------------------------------------------
echo "[..] Deploying with Helm..."
helm upgrade --install music-app "$REPO_ROOT/k8s/music-app" \
  --namespace music-app \
  --create-namespace \
  --wait --timeout 10m
echo "[OK] Helm release deployed."

# ------------------------------------------------------------------
# 4. Wait for all pods to be ready
# ------------------------------------------------------------------
echo "[..] Waiting for all pods to be ready..."
kubectl wait --for=condition=Ready pods --all \
  --namespace music-app \
  --timeout=300s
echo "[OK] All pods are ready."

# ------------------------------------------------------------------
# 5. Print access information
# ------------------------------------------------------------------
MINIKUBE_IP=$(minikube ip)

echo ""
echo "=== Deployment complete! ==="
echo ""
echo "Minikube IP: $MINIKUBE_IP"
echo ""
echo "Application:"
echo "  Gateway:    http://music-app.local (via Ingress)"
echo ""
echo "Port-forward commands for infrastructure UIs:"
echo "  RabbitMQ:     kubectl port-forward -n music-app svc/rabbitmq 15672:15672"
echo "  MinIO:        kubectl port-forward -n music-app svc/minio 9001:9001"
echo "  Grafana:      kubectl port-forward -n music-app svc/grafana 3001:3000"
echo "  Prometheus:   kubectl port-forward -n music-app svc/prometheus 9090:9090"
echo "  Kibana:       kubectl port-forward -n music-app svc/kibana 5601:5601"
echo "  Jaeger:       kubectl port-forward -n music-app svc/jaeger 16686:16686"
echo "  Neo4j:        kubectl port-forward -n music-app svc/neo4j 7474:7474"
echo ""
echo "Check pod status:"
echo "  kubectl get pods -n music-app"
echo ""
