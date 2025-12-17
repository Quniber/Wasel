#!/bin/bash
# ============================================================
# WASEL TAXI PLATFORM - FIREWALL SETUP SCRIPT
# ============================================================

set -e

echo "Setting up UFW firewall..."

# Enable UFW
apt install -y ufw

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp

# Allow HTTP & HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow API ports (for direct access if needed)
ufw allow 3000/tcp  # Admin API
ufw allow 3001/tcp  # Rider API
ufw allow 3002/tcp  # Driver API
ufw allow 3003/tcp  # Admin Panel

# Enable firewall
echo "y" | ufw enable

# Show status
ufw status verbose

echo ""
echo "Firewall configured successfully!"
