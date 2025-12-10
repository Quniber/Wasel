# Taxi Platform - Project Structure

Last Updated: 2025-11-25

## Overview
Turborepo monorepo with NestJS APIs and Prisma ORM

```
taxi-platform/
├── apps/
│   ├── admin-api/                 # Admin Panel Backend (port 3000)
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── customers/
│   │   │   │   ├── customers.controller.ts
│   │   │   │   ├── customers.module.ts
│   │   │   │   └── customers.service.ts
│   │   │   ├── drivers/
│   │   │   │   ├── drivers.controller.ts
│   │   │   │   ├── drivers.module.ts
│   │   │   │   └── drivers.service.ts
│   │   │   ├── orders/
│   │   │   │   ├── orders.controller.ts
│   │   │   │   ├── orders.module.ts
│   │   │   │   └── orders.service.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── services/
│   │   │   │   ├── services.controller.ts
│   │   │   │   ├── services.module.ts
│   │   │   │   └── services.service.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── rider-api/                 # Customer App Backend (port 3001)
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── orders/
│   │   │   │   ├── orders.controller.ts
│   │   │   │   ├── orders.module.ts
│   │   │   │   └── orders.service.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── driver-api/                # Driver App Backend (port 3002)
│       ├── src/
│       │   ├── auth/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── jwt-auth.guard.ts
│       │   │   └── jwt.strategy.ts
│       │   ├── orders/
│       │   │   ├── orders.controller.ts
│       │   │   ├── orders.module.ts
│       │   │   └── orders.service.ts
│       │   ├── prisma/
│       │   │   ├── prisma.module.ts
│       │   │   └── prisma.service.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── nest-cli.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── database/                  # Shared Prisma Database
│       ├── prisma/
│       │   └── schema.prisma      # Database schema
│       ├── src/
│       │   └── index.ts           # Prisma client export
│       ├── .env                   # Database connection
│       ├── package.json
│       └── tsconfig.json
│
├── .env                           # Root environment variables
├── package.json                   # Turborepo config
├── turbo.json                     # Turborepo pipeline
├── STRUCTURE.md                   # This file
└── PROJECT_PLAN.md                # Comprehensive project roadmap
```

## Database Tables (MySQL)
- `customers` - App users (riders)
- `drivers` - Driver accounts
- `operators` - Admin panel users
- `orders` - Ride orders
- `services` - Service types (Economy, Premium, etc.)

## API Endpoints

### Admin API (port 3000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Operator login |
| POST | /api/auth/register | Register operator |
| GET | /api/customers | List customers |
| GET | /api/customers/:id | Get customer |
| PATCH | /api/customers/:id | Update customer |
| DELETE | /api/customers/:id | Delete customer |
| GET | /api/drivers | List drivers |
| GET | /api/drivers/:id | Get driver |
| POST | /api/drivers | Create driver |
| PATCH | /api/drivers/:id | Update driver |
| DELETE | /api/drivers/:id | Delete driver |
| GET | /api/services | List services |
| GET | /api/services/:id | Get service |
| POST | /api/services | Create service |
| PATCH | /api/services/:id | Update service |
| DELETE | /api/services/:id | Delete service |
| GET | /api/orders | List orders |
| GET | /api/orders/stats | Order statistics |
| GET | /api/orders/:id | Get order |
| PATCH | /api/orders/:id/status | Update order status |
| PATCH | /api/orders/:id/assign | Assign driver |

### Rider API (port 3001)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Customer registration |
| POST | /api/auth/login | Customer login |
| GET | /api/orders/services | List available services |
| POST | /api/orders | Create order |
| GET | /api/orders | My orders |
| GET | /api/orders/:id | Get order details |
| PATCH | /api/orders/:id/cancel | Cancel order |

### Driver API (port 3002)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Driver login |
| PATCH | /api/auth/status | Update online status |
| PATCH | /api/auth/location | Update location |
| GET | /api/orders/available | Available orders |
| GET | /api/orders/current | Current active order |
| GET | /api/orders/my | My order history |
| POST | /api/orders/:id/accept | Accept order |
| PATCH | /api/orders/:id/status | Update order status |

## Commands
```bash
npm run admin-api    # Start admin API (port 3000)
npm run rider-api    # Start rider API (port 3001)
npm run driver-api   # Start driver API (port 3002)
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

## Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: NestJS 10
- **Database**: MySQL + Prisma ORM
- **Auth**: JWT (Passport)
- **Monorepo**: Turborepo
- **Language**: TypeScript 5
