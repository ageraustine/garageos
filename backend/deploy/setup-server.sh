#!/bin/bash
# GarageOS Backend - Server Setup Script
# Run this once on a fresh Ubuntu server
# Usage: sudo ./setup-server.sh

set -e

echo "=========================================="
echo "GarageOS Backend - Server Setup"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo ./setup-server.sh)"
    exit 1
fi

APP_USER="paperspace"
APP_DIR="/home/$APP_USER/garageos"

echo ""
echo "[1/6] Fixing apt_pkg and updating system packages..."
# Fix apt_pkg module issue (common on Ubuntu with multiple Python versions)
if ! python3 -c "import apt_pkg" 2>/dev/null; then
    echo "Fixing apt_pkg module..."
    apt-get install -y --reinstall python3-apt 2>/dev/null || true
    # Create symlink if needed
    cd /usr/lib/python3/dist-packages/
    if [ -f apt_pkg.cpython-*-x86_64-linux-gnu.so ]; then
        ln -sf apt_pkg.cpython-*-x86_64-linux-gnu.so apt_pkg.so 2>/dev/null || true
    fi
    cd - > /dev/null
fi

apt-get update || true
apt-get upgrade -y

echo ""
echo "[2/6] Installing Python 3.11 and dependencies..."
apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    python3-pip \
    build-essential \
    libpq-dev \
    git \
    curl \
    wget \
    nginx \
    certbot \
    python3-certbot-nginx

# Set Python 3.11 as default
update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

echo ""
echo "[3/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker $APP_USER
    systemctl enable docker
    systemctl start docker
else
    echo "Docker already installed"
fi

echo ""
echo "[4/6] Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

echo ""
echo "[5/6] Setting up application directory..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

echo ""
echo "[6/6] Installing systemd service..."
cp /home/$APP_USER/garageos/backend/deploy/garageos-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable garageos-backend

echo ""
echo "=========================================="
echo "Server setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Clone repo:     cd /home/$APP_USER && git clone git@github.com:ageraustine/garageos.git"
echo "2. Create .env:    cp $APP_DIR/backend/.env.example $APP_DIR/backend/.env"
echo "3. Edit .env:      nano $APP_DIR/backend/.env"
echo "4. Start services: cd $APP_DIR && docker-compose up -d"
echo "5. Deploy backend: cd $APP_DIR/backend && ./deploy/deploy.sh"
echo ""
echo "To check status:   systemctl status garageos-backend"
echo "To view logs:      journalctl -u garageos-backend -f"
echo ""
