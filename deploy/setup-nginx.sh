#!/bin/bash
# ============================================================
# WASEL TAXI PLATFORM - NGINX SETUP SCRIPT
# ============================================================

set -e

echo "Setting up Nginx for Wasel..."

# Create PM2 log directory
mkdir -p /var/log/pm2

# Copy nginx config
cp /var/www/wasel/deploy/nginx.conf /etc/nginx/sites-available/wasel

# Enable site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/wasel /etc/nginx/sites-enabled/wasel

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx

echo "Nginx configured successfully!"
echo ""
echo "Access points:"
echo "  - Admin Panel: http://72.60.80.118"
echo "  - Admin API:   http://72.60.80.118/admin-api/"
echo "  - Rider API:   http://72.60.80.118/rider-api/"
echo "  - Driver API:  http://72.60.80.118/driver-api/"
echo ""
echo "Direct API access:"
echo "  - Admin API:   http://72.60.80.118:3000"
echo "  - Rider API:   http://72.60.80.118:3001"
echo "  - Driver API:  http://72.60.80.118:3002"
