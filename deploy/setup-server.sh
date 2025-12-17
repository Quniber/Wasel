#!/bin/bash
# ============================================================
# WASEL TAXI PLATFORM - VPS SERVER SETUP SCRIPT
# Ubuntu 24.04 LTS
# ============================================================

set -e

echo "============================================================"
echo "WASEL TAXI PLATFORM - SERVER SETUP"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
DB_NAME="wasel"
DB_USER="wasel_user"
DB_PASS="WaselDb2024!Secure"
JWT_SECRET="wasel-taxi-jwt-secret-key-production-2024-very-secure"
SERVER_IP="72.60.80.118"

echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/8] Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version

echo -e "${YELLOW}[3/8] Installing MySQL 8...${NC}"
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql

# Secure MySQL and create database
echo -e "${YELLOW}[4/8] Configuring MySQL database...${NC}"
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo -e "${GREEN}Database '${DB_NAME}' created with user '${DB_USER}'${NC}"

echo -e "${YELLOW}[5/8] Installing PM2 process manager...${NC}"
npm install -g pm2
pm2 startup systemd -u root --hp /root

echo -e "${YELLOW}[6/8] Installing Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

echo -e "${YELLOW}[7/8] Installing additional tools...${NC}"
apt install -y git unzip htop

echo -e "${YELLOW}[8/8] Creating application directory...${NC}"
mkdir -p /var/www/wasel
chown -R root:root /var/www/wasel

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}SERVER SETUP COMPLETED!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Database Configuration:"
echo "  - Database: ${DB_NAME}"
echo "  - Username: ${DB_USER}"
echo "  - Password: ${DB_PASS}"
echo ""
echo "DATABASE_URL: mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
echo ""
echo "Next steps:"
echo "  1. Upload your project to /var/www/wasel"
echo "  2. Run: cd /var/www/wasel && bash deploy/deploy-app.sh"
echo ""
