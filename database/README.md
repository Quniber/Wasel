# Wasel Database Setup

This folder contains the database initialization files for the Wasel taxi platform.

## Database Type

- **Database**: MySQL 8.0+
- **ORM**: Prisma

## Setup Methods

### Method 1: Using Prisma (Recommended)

1. Navigate to the database package:
   ```bash
   cd packages/database
   ```

2. Create a `.env` file with your database URL:
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/wasel"
   ```

3. Push the schema to the database:
   ```bash
   npm run db:push
   ```

4. Seed the database with initial data:
   ```bash
   npm run db:seed
   ```

### Method 2: Using SQL File

1. Create a MySQL database:
   ```sql
   CREATE DATABASE wasel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Import the SQL file:
   ```bash
   mysql -u root -p wasel < database/wasel_database.sql
   ```

## Database Schema

The database contains 40+ tables organized into the following domains:

### Core Tables
- **customers** - Rider accounts
- **drivers** - Driver accounts with vehicle info
- **operators** - Admin panel users
- **fleets** - Fleet management companies

### Service Tables
- **services** - Service types (Economy, Premium, XL)
- **service_categories** - Service categories
- **service_options** - Add-on options for services
- **regions** - Geographic service regions

### Order Tables
- **orders** - Ride orders
- **order_messages** - In-app chat
- **order_activities** - Status change history
- **order_cancel_reasons** - Cancellation reasons

### Payment Tables
- **payment_gateways** - Payment providers
- **saved_payment_methods** - Saved cards
- **coupons** - Discount coupons
- **customer_transactions** - Wallet transactions
- **driver_transactions** - Driver earnings

### Support Tables
- **support_requests** - Customer support tickets
- **sos** - Emergency SOS calls
- **feedbacks** - Rider feedback on drivers

## Default Admin Account

After initialization, you can log in to the admin panel with:

- **Email**: admin@taxi.com
- **Password**: Admin123!

## Initial Seed Data

The database is initialized with:

| Data Type | Count |
|-----------|-------|
| Document Types | 6 |
| Car Models | 10 |
| Car Colors | 10 |
| Cancel Reasons | 12 |
| Services | 3 |
| Settings | 10 |
| Review Parameters | 8 |
| Payment Gateways | 1 (Cash) |

## Prisma Studio

To visually browse and edit your database:

```bash
cd packages/database
npm run db:studio
```

This will open Prisma Studio at http://localhost:5555
