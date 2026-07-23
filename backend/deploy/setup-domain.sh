#!/bin/bash
# GarageOS Backend - Domain & SSL Setup
# Usage: ./setup-domain.sh <domain> <email>
# Example: ./setup-domain.sh api.garigraph.com admin@garigraph.com

set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./setup-domain.sh <domain> <email>"
    echo "Example: ./setup-domain.sh api.garigraph.com admin@garigraph.com"
    exit 1
fi

echo "=========================================="
echo "Setting up $DOMAIN"
echo "=========================================="

# 1. Check DNS
echo ""
echo "[1/5] Checking DNS propagation..."
SERVER_IP=$(curl -s ifconfig.me)
DNS_IP=$(dig +short $DOMAIN)

echo "Server IP: $SERVER_IP"
echo "DNS resolves to: $DNS_IP"

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    echo ""
    echo "ERROR: DNS not pointing to this server!"
    echo "Add this A record to your DNS:"
    echo ""
    echo "  Type: A"
    echo "  Name: $(echo $DOMAIN | cut -d. -f1)"
    echo "  Value: $SERVER_IP"
    echo "  TTL: 300"
    echo ""
    echo "Then run this script again."
    exit 1
fi
echo "✓ DNS is correctly configured"

# 2. Install certbot if needed
echo ""
echo "[2/5] Checking certbot..."
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo snap install --classic certbot
    sudo ln -sf /snap/bin/certbot /usr/bin/certbot
fi
echo "✓ Certbot ready"

# 3. Configure nginx
echo ""
echo "[3/5] Configuring nginx..."
sudo tee /etc/nginx/sites-available/garageos > /dev/null << NGINXCONF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;

        # Large file uploads (for media)
        client_max_body_size 50M;
    }
}
NGINXCONF

sudo ln -sf /etc/nginx/sites-available/garageos /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo nginx -s reload
echo "✓ Nginx configured"

# 4. Get SSL certificate
echo ""
echo "[4/5] Getting SSL certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
echo "✓ SSL certificate installed"

# 5. Update backend CORS
echo ""
echo "[5/5] Updating backend configuration..."
# Ensure CORS allows all (or update to specific frontend domain)
sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=*|' ~/garageos/backend/.env
sudo systemctl restart garageos-backend
echo "✓ Backend restarted"

# Verify
echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "API URL: https://$DOMAIN/api/v1"
echo "API Docs: https://$DOMAIN/docs"
echo ""
echo "Set in Vercel:"
echo "NEXT_PUBLIC_API_URL=https://$DOMAIN/api/v1"
echo ""
echo "Testing..."
curl -s https://$DOMAIN/health
echo ""
