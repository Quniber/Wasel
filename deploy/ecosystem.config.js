// PM2 Ecosystem Configuration for Wasel Taxi Platform
module.exports = {
  apps: [
    {
      name: 'admin-api',
      cwd: '/var/www/wasel/apps/admin-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/admin-api-error.log',
      out_file: '/var/log/pm2/admin-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      restart_delay: 3000,
      autorestart: true,
      watch: false
    },
    {
      name: 'rider-api',
      cwd: '/var/www/wasel/apps/rider-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/rider-api-error.log',
      out_file: '/var/log/pm2/rider-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      restart_delay: 3000,
      autorestart: true,
      watch: false
    },
    {
      name: 'driver-api',
      cwd: '/var/www/wasel/apps/driver-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: '/var/log/pm2/driver-api-error.log',
      out_file: '/var/log/pm2/driver-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      restart_delay: 3000,
      autorestart: true,
      watch: false
    },
    {
      name: 'admin-panel',
      cwd: '/var/www/wasel/apps/admin-panel',
      script: 'node_modules/.bin/next',
      args: 'start -p 3003',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: '/var/log/pm2/admin-panel-error.log',
      out_file: '/var/log/pm2/admin-panel-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      restart_delay: 3000,
      autorestart: true,
      watch: false
    }
  ]
};
