# Wasel Taxi Platform - Deployment Guide

## Server Information

- **IP Address:** 72.60.80.118
- **Username:** root
- **Password:** Shafrah974@@
- **OS:** Ubuntu 24.04 LTS

## Quick Deployment Steps

### Step 1: Connect to Server

```bash
ssh root@72.60.80.118
```

### Step 2: Upload Project Files

Option A: Using SCP (from your local machine)
```bash
# From your local machine, in the Wasel directory
cd /Users/quniber/Desktop/shafrah/Wasel
scp -r . root@72.60.80.118:/var/www/wasel/
```

Option B: Using SFTP client (FileZilla, Cyberduck, etc.)
- Host: 72.60.80.118
- Username: root
- Password: Shafrah974@@
- Upload to: /var/www/wasel/

### Step 3: Run Server Setup (First Time Only)

```bash
ssh root@72.60.80.118
mkdir -p /var/www/wasel
cd /var/www/wasel
chmod +x deploy/*.sh
bash deploy/setup-server.sh
```

### Step 4: Deploy Application

```bash
cd /var/www/wasel
bash deploy/deploy-app.sh
```

### Step 5: Configure Nginx

```bash
bash deploy/setup-nginx.sh
```

### Step 6: Setup Firewall (Optional)

```bash
bash deploy/setup-firewall.sh
```

## Access URLs

After deployment, your services will be available at:

| Service | URL |
|---------|-----|
| Admin Panel | http://72.60.80.118 |
| Admin API | http://72.60.80.118:3000 |
| Rider API | http://72.60.80.118:3001 |
| Driver API | http://72.60.80.118:3002 |

### Via Nginx Proxy

| Service | URL |
|---------|-----|
| Admin API | http://72.60.80.118/admin-api/ |
| Rider API | http://72.60.80.118/rider-api/ |
| Driver API | http://72.60.80.118/driver-api/ |

## Default Admin Login

- **Email:** admin@taxi.com
- **Password:** Admin123!

## Database Configuration

- **Host:** localhost
- **Database:** wasel
- **Username:** wasel_user
- **Password:** WaselDb2024!Secure

## Useful Commands

### PM2 Commands
```bash
pm2 status          # Check status of all services
pm2 logs            # View all logs
pm2 logs admin-api  # View specific service logs
pm2 restart all     # Restart all services
pm2 stop all        # Stop all services
pm2 start all       # Start all services
pm2 monit           # Real-time monitoring
```

### Database Commands
```bash
mysql -u wasel_user -p wasel    # Connect to database
npm run db:studio               # Open Prisma Studio (port 5555)
```

### Service Management
```bash
systemctl status nginx   # Check Nginx status
systemctl restart nginx  # Restart Nginx
systemctl status mysql   # Check MySQL status
```

## Troubleshooting

### Check if ports are in use
```bash
netstat -tlnp | grep -E '3000|3001|3002|3003'
```

### Check PM2 logs for errors
```bash
pm2 logs --err
```

### Restart everything
```bash
pm2 restart all
systemctl restart nginx
```

### Reset database
```bash
cd /var/www/wasel
npm run db:push
cd packages/database && npx prisma db seed
```

## Mobile App Configuration

Update your mobile apps to use these API endpoints:

### Rider App (.env)
```
EXPO_PUBLIC_API_URL=http://72.60.80.118:3001
EXPO_PUBLIC_SOCKET_URL=http://72.60.80.118:3001
```

### Driver App (.env)
```
EXPO_PUBLIC_API_URL=http://72.60.80.118:3002
EXPO_PUBLIC_SOCKET_URL=http://72.60.80.118:3002
```

## Security Notes

1. Change default passwords in production
2. Enable HTTPS with Let's Encrypt
3. Configure proper firewall rules
4. Keep system updated regularly
