#!/bin/bash
# ============================================================
# WASEL TAXI PLATFORM - SSL SETUP SCRIPT
# Domain: wasel.shafrah.qa
# ============================================================

set -e

DOMAIN="wasel.shafrah.qa"
EMAIL="rashid@shafrah.qa"

echo "Setting up SSL for $DOMAIN..."

# Install Certbot
apt update
apt install -y certbot python3-certbot-nginx

# Check if domain resolves to this server
echo "Checking DNS resolution..."
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | head -n1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo "WARNING: Domain $DOMAIN does not point to this server yet!"
    echo "Server IP: $SERVER_IP"
    echo "Domain resolves to: $DOMAIN_IP"
    echo ""
    echo "Please add an A record:"
    echo "  Name: wasel"
    echo "  Type: A"
    echo "  Value: $SERVER_IP"
    echo ""
    read -p "Press Enter to continue anyway, or Ctrl+C to cancel..."
fi

# Update Nginx config with domain
cat > /etc/nginx/sites-available/wasel << 'NGINX_CONFIG'
# Nginx Configuration for Wasel Taxi Platform
# Domain: wasel.shafrah.qa

server {
    listen 80;
    server_name wasel.shafrah.qa;

    # Admin Panel (Main)
    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Admin API
    location /admin-api/ {
        rewrite ^/admin-api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_buffering off;
    }

    # Rider API
    location /rider-api/ {
        rewrite ^/rider-api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_buffering off;
    }

    # Driver API
    location /driver-api/ {
        rewrite ^/driver-api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_buffering off;
    }

    # File upload size
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/json;
    gzip_disable "MSIE [1-6]\.";
}
NGINX_CONFIG

# Test and reload Nginx
nginx -t
systemctl reload nginx

# Get SSL certificate
echo "Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Verify SSL
echo ""
echo "============================================================"
echo "SSL Setup Complete!"
echo "============================================================"
echo ""
echo "Your site is now available at:"
echo "  https://wasel.shafrah.qa"
echo ""
echo "API Endpoints:"
echo "  https://wasel.shafrah.qa/admin-api/"
echo "  https://wasel.shafrah.qa/rider-api/"
echo "  https://wasel.shafrah.qa/driver-api/"
echo ""
echo "SSL certificate will auto-renew via certbot timer."
echo ""
