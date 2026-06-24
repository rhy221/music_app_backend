#!/usr/bin/env bash
set -euo pipefail

echo "=== Music App - Minikube Setup ==="
echo ""

# ------------------------------------------------------------------
# 1. Check prerequisites
# ------------------------------------------------------------------
MISSING=()
for cmd in minikube kubectl helm; do
  if ! command -v "$cmd" &>/dev/null; then
    MISSING+=("$cmd")
  fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
  echo "ERROR: The following tools are not installed: ${MISSING[*]}"
  echo "Please install them before running this script."
  exit 1
fi

echo "[OK] minikube, kubectl, and helm are installed."

# ------------------------------------------------------------------
# 2. Start minikube
# ------------------------------------------------------------------
if minikube status --format='{{.Host}}' 2>/dev/null | grep -q "Running"; then
  echo "[OK] Minikube is already running."
else
  echo "[..] Starting minikube (cpus=4, memory=8192, driver=docker)..."
  minikube start --cpus=4 --memory=8192 --driver=docker
  echo "[OK] Minikube started."
fi

# ------------------------------------------------------------------
# 3. Enable addons
# ------------------------------------------------------------------
echo "[..] Enabling minikube addons..."
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable dashboard
echo "[OK] Addons enabled: ingress, metrics-server, dashboard."

# ------------------------------------------------------------------
# 4. Configure Docker environment
# ------------------------------------------------------------------
echo "[..] Configuring Docker to use minikube's daemon..."
eval $(minikube docker-env)
echo "[OK] Docker environment configured."

# ------------------------------------------------------------------
# 5. Add music-app.local to /etc/hosts
# ------------------------------------------------------------------
MINIKUBE_IP=$(minikube ip)
HOSTS_ENTRY="$MINIKUBE_IP music-app.local"

if grep -q "music-app.local" /etc/hosts 2>/dev/null; then
  echo "[OK] music-app.local already in /etc/hosts."
else
  echo "[..] Adding music-app.local to /etc/hosts (requires sudo)..."
  echo "$HOSTS_ENTRY" | sudo tee -a /etc/hosts >/dev/null
  echo "[OK] Added '$HOSTS_ENTRY' to /etc/hosts."
fi

# ------------------------------------------------------------------
# 6. Done
# ------------------------------------------------------------------
echo ""
echo "=== Minikube setup complete! ==="
echo ""
echo "Minikube IP:  $MINIKUBE_IP"
echo "Dashboard:    minikube dashboard"
echo ""
echo "Next steps:"
echo "  1. Build images:  ./k8s/scripts/build-images.sh"
echo "  2. Deploy:        ./k8s/scripts/deploy.sh"
echo ""
