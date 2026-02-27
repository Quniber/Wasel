#!/bin/bash
# ============================================================
# WASEL TAXI PLATFORM - APPLICATION DEPLOYMENT SCRIPT
# ============================================================

set -e

echo "============================================================"
echo "WASEL TAXI PLATFORM - APPLICATION DEPLOYMENT"
echo "============================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
APP_DIR="/var/www/wasel"
DB_NAME="wasel"
DB_USER="wasel_user"
DB_PASS="WaselDb2024!Secure"
JWT_SECRET="wasel-taxi-jwt-secret-key-production-2024-very-secure"
SERVER_IP="72.60.80.118"

cd $APP_DIR

echo -e "${YELLOW}[1/7] Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}[2/7] Setting up environment files...${NC}"

# Root .env
cat > .env << EOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
NODE_ENV="production"
EOF

# Database package .env
cat > packages/database/.env << EOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
EOF

# Admin API .env
cat > apps/admin-api/.env << EOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
PORT=3000
NODE_ENV="production"
EOF

# Rider API .env
cat > apps/rider-api/.env << EOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
PORT=3001
NODE_ENV="production"
TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID}"
TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN}"
TWILIO_VERIFY_SERVICE_SID="${TWILIO_VERIFY_SERVICE_SID}"
EOF

# Driver API .env
cat > apps/driver-api/.env << EOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
PORT=3002
NODE_ENV="production"
DRIVER_API_URL="http://localhost:3002"
EOF

# Admin Panel .env
cat > apps/admin-panel/.env << EOF
NEXT_PUBLIC_API_URL="http://${SERVER_IP}:3000"
NEXT_PUBLIC_SOCKET_URL="http://${SERVER_IP}:3000"
EOF

echo -e "${GREEN}Environment files created${NC}"

echo -e "${YELLOW}[3/7] Generating Prisma client...${NC}"
npm run db:generate

echo -e "${YELLOW}[4/7] Setting up database schema...${NC}"
npm run db:push

echo -e "${YELLOW}[5/7] Seeding database...${NC}"
cd packages/database
npx prisma db seed || echo "Seed may have already been applied"
cd $APP_DIR

echo -e "${YELLOW}[6/7] Building applications...${NC}"
npm run build

echo -e "${YELLOW}[7/7] Starting applications with PM2...${NC}"
pm2 delete all 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETED!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Services running:"
echo "  - Admin API:   http://${SERVER_IP}:3000"
echo "  - Rider API:   http://${SERVER_IP}:3001"
echo "  - Driver API:  http://${SERVER_IP}:3002"
echo "  - Admin Panel: http://${SERVER_IP}:3003"
echo ""
echo "Admin Login:"
echo "  - Email: admin@taxi.com"
echo "  - Password: Admin123!"
echo ""
echo "Commands:"
echo "  - pm2 status       # Check status"
echo "  - pm2 logs         # View logs"
echo "  - pm2 restart all  # Restart all"
echo ""
