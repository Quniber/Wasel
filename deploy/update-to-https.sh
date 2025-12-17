#!/bin/bash
# ============================================================
# WASEL TAXI PLATFORM - UPDATE TO HTTPS
# Updates all .env files to use HTTPS domain
# ============================================================

set -e

DOMAIN="wasel.shafrah.qa"

echo "Updating environment files to use HTTPS..."

# Update admin-panel .env
cat > /var/www/wasel/apps/admin-panel/.env << EOF
NEXT_PUBLIC_API_URL=https://${DOMAIN}/admin-api
NEXT_PUBLIC_SOCKET_URL=https://${DOMAIN}
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCcjyEPNrx4eRMYof-Z_4aEBjUdRQN8VlE
EOF

# Update admin-api .env
cat > /var/www/wasel/apps/admin-api/.env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL="mysql://wasel_user:WaselDb2024!Secure@localhost:3306/wasel"
JWT_SECRET=wasel-jwt-secret-key-2024-production
CORS_ORIGIN=https://${DOMAIN}
EOF

# Update rider-api .env
cat > /var/www/wasel/apps/rider-api/.env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL="mysql://wasel_user:WaselDb2024!Secure@localhost:3306/wasel"
JWT_SECRET=wasel-jwt-secret-key-2024-production
CORS_ORIGIN=https://${DOMAIN}
EOF

# Update driver-api .env
cat > /var/www/wasel/apps/driver-api/.env << EOF
NODE_ENV=production
PORT=3002
DATABASE_URL="mysql://wasel_user:WaselDb2024!Secure@localhost:3306/wasel"
JWT_SECRET=wasel-jwt-secret-key-2024-production
CORS_ORIGIN=https://${DOMAIN}
EOF

# Rebuild admin-panel with new env
echo "Rebuilding admin-panel with HTTPS configuration..."
cd /var/www/wasel/apps/admin-panel
npm run build

# Restart all services
echo "Restarting all services..."
pm2 restart all

echo ""
echo "============================================================"
echo "Environment updated to HTTPS!"
echo "============================================================"
echo ""
echo "Access your platform at: https://${DOMAIN}"
echo ""
