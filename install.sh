#!/bin/bash
# AR Overlay Docker — one-command install for Debian/Ubuntu VPS
set -e

REPO="https://github.com/ivolga76/ar-overlay-docker.git"
APP_DIR="/opt/ar-overlay"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

echo "============================================"
echo "  AR Overlay Docker — VPS Installer"
echo "============================================"
echo ""

# ── Step 1: Install Docker if missing ──
echo "[1/4] Checking Docker..."
if ! command -v docker &>/dev/null; then
    echo "       Docker not found, installing..."
    curl -fsSL https://get.docker.com | bash
    echo "       Docker installed."
else
    echo "       Docker already installed: $(docker --version)"
fi

# Ensure docker compose plugin is available
if ! docker compose version &>/dev/null; then
    echo "       Installing docker compose plugin..."
    apt-get update -qq && apt-get install -y -qq docker-compose-plugin
fi

# ── Step 2: Start Docker daemon if not running ──
if ! docker info &>/dev/null; then
    echo "       Starting Docker daemon..."
    systemctl start docker || service docker start
    sleep 2
fi

# ── Step 3: Clone or update repository ──
echo "[2/4] Repository..."
if [ -d "$APP_DIR/.git" ]; then
    echo "       Updating existing repository..."
    cd "$APP_DIR"
    git pull --ff-only
else
    echo "       Cloning repository..."
    rm -rf "$APP_DIR"
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

# ── Step 4: Build and start ──
echo "[3/4] Building and starting containers..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d --build

# ── Step 5: Verify ──
echo "[4/4] Verifying..."
sleep 3

if docker compose ps | grep -q "Up"; then
    echo ""
    echo "============================================"
    echo "  AR OVERLAY IS RUNNING!"
    echo "============================================"
    echo ""
    
    # Try to get public IP
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "YOUR_VPS_IP")
    echo "  URL:  http://${PUBLIC_IP}:3001"
    echo "  Admin: http://${PUBLIC_IP}:3001/admin"
    echo ""
    echo "  Add to OBS as Browser Source:"
    echo "  URL:  http://${PUBLIC_IP}:3001/overlay/<user-id>"
    echo "  Size: 1920 x 1080"
    echo ""
    echo "  Commands:"
    echo "    docker compose logs -f    # view logs"
    echo "    docker compose restart    # restart app"
    echo "    docker compose down       # stop app"
    echo "    docker compose up -d      # start app"
    echo "    docker compose pull       # update image"
else
    echo ""
    echo "[ERROR] Container failed to start. Check logs:"
    echo "       cd $APP_DIR && docker compose logs"
    exit 1
fi
