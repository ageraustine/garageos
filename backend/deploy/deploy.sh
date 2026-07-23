#!/bin/bash
# GarageOS Backend - Deployment Script
# Usage: ./deploy.sh [branch]

set -e

BRANCH=${1:-main}
APP_DIR="/home/paperspace/garageos"
BACKEND_DIR="$APP_DIR/backend"

echo "=========================================="
echo "GarageOS Backend - Deploying $BRANCH"
echo "=========================================="

cd $APP_DIR

echo ""
echo "[1/6] Pulling latest code..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

echo ""
echo "[2/6] Activating virtual environment..."
cd $BACKEND_DIR
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate

echo ""
echo "[3/6] Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "[4/6] Running database migrations..."
alembic upgrade head

echo ""
echo "[5/6] Restarting backend service..."
sudo systemctl restart garageos-backend

echo ""
echo "[6/6] Checking service status..."
sleep 2
if systemctl is-active --quiet garageos-backend; then
    echo "✓ Backend service is running"
else
    echo "✗ Backend service failed to start"
    echo "Check logs: journalctl -u garageos-backend -n 50"
    exit 1
fi

# Health check
echo ""
echo "Running health check..."
sleep 3
if curl -sf http://localhost:8000/health > /dev/null; then
    echo "✓ Health check passed"
else
    echo "✗ Health check failed"
    echo "Check logs: journalctl -u garageos-backend -n 50"
    exit 1
fi

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "View logs:    journalctl -u garageos-backend -f"
echo "API docs:     http://$(hostname -I | awk '{print $1}'):8000/docs"
echo ""
