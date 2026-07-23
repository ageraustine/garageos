#!/bin/bash
# GarageOS - ngrok Tunnel Setup
# Usage: ./setup-ngrok.sh <NGROK_AUTH_TOKEN>

set -e

AUTH_TOKEN=$1

if [ -z "$AUTH_TOKEN" ]; then
    echo "Usage: ./setup-ngrok.sh <NGROK_AUTH_TOKEN>"
    echo "Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken"
    exit 1
fi

echo "=========================================="
echo "Setting up ngrok tunnel"
echo "=========================================="

echo ""
echo "[1/4] Installing ngrok..."
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install -y ngrok

echo ""
echo "[2/4] Configuring authtoken..."
ngrok config add-authtoken $AUTH_TOKEN

echo ""
echo "[3/4] Creating systemd service..."
sudo tee /etc/systemd/system/ngrok.service > /dev/null << 'EOF'
[Unit]
Description=ngrok tunnel for GarageOS API
After=network.target garageos-backend.service

[Service]
Type=simple
User=paperspace
ExecStart=/usr/bin/ngrok http 8000 --log=stdout
Restart=always
RestartSec=10
Environment="HOME=/home/paperspace"

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "[4/4] Starting ngrok service..."
sudo systemctl daemon-reload
sudo systemctl enable ngrok
sudo systemctl start ngrok

echo ""
echo "Waiting for tunnel to establish..."
sleep 5

# Get the public URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4)

echo ""
echo "=========================================="
echo "ngrok tunnel is running!"
echo "=========================================="
echo ""
echo "Public URL: $NGROK_URL"
echo ""
echo "Set this in Vercel:"
echo "NEXT_PUBLIC_API_URL=${NGROK_URL}/api/v1"
echo ""
echo "Commands:"
echo "  Status:  sudo systemctl status ngrok"
echo "  Logs:    sudo journalctl -u ngrok -f"
echo "  Restart: sudo systemctl restart ngrok"
echo ""
