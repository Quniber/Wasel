# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wasel is a ride-hailing platform built as a **Turborepo monorepo** with:
- **3 Backend APIs** (NestJS): Admin (port 3000), Rider (port 3001), Driver (port 3002)
- **1 Real-time Socket API** (NestJS + Socket.IO, port 3004)
- **2 Mobile Apps** (React Native + Expo): Rider and Driver apps
- **1 Admin Web Panel** (Next.js, port 3003)
- **Shared Packages**: Database (Prisma/MySQL), Socket events, Payment gateways

Tech stack: TypeScript, NestJS, Expo/React Native, Next.js, Prisma, MySQL, Socket.IO, Zustand, React Query, NativeWind.

## Commands

### Development
```bash
npm run dev              # Start all APIs + admin panel via Turbo
npm run admin-api        # Admin API only (port 3000)
npm run rider-api        # Rider API only (port 3001)
npm run driver-api       # Driver API only (port 3002)

# Socket API (must run directly, not via workspace)
cd apps/socket-api && npm run dev

# Mobile apps
cd apps/rider-app && npm start    # Expo dev server
cd apps/driver-app && npm start
```

### Database (Prisma)
```bash
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Prisma Studio GUI
cd packages/database && npm run seed  # Seed database
```

### Mobile Builds (EAS)
```bash
cd apps/rider-app   # or driver-app
eas build --profile development --platform ios
eas build --profile preview --platform ios
eas build --profile production --platform ios
```

### Build & Lint
```bash
npm run build            # Build all apps
npm run lint             # Lint all apps
```

## Architecture

### Monorepo Structure
```
apps/
├── admin-api/       # NestJS - Admin backend (port 3000)
├── admin-panel/     # Next.js - Admin web UI (port 3003)
├── rider-api/       # NestJS - Customer backend (port 3001)
├── rider-app/       # Expo - Customer mobile app
├── driver-api/      # NestJS - Driver backend (port 3002)
├── driver-app/      # Expo - Driver mobile app
└── socket-api/      # NestJS + Socket.IO - Real-time events (port 3004)

packages/
├── database/        # Prisma schema + client (shared by all APIs)
├── shared/          # Payment gateway abstraction
└── socket/          # Socket.IO utilities: RoomManager, DriverTracker, event types
```

**Note**: Mobile apps and socket-api are NOT in the root workspaces array (see `package.json`). Run them directly from their directories.

### NestJS API Pattern
Each API follows this module structure:
```
src/
├── auth/            # JWT + Passport strategies
├── {domain}/        # Feature module
│   ├── {domain}.controller.ts
│   ├── {domain}.service.ts
│   ├── {domain}.module.ts
│   └── dto/         # class-validator DTOs
├── prisma/          # PrismaService singleton
└── main.ts
```

**Key modules**:
- **Admin API**: customers, drivers, orders, services, fleets, operators, complaints, coupons, **socket/** (DispatchService for order routing)
- **Rider API**: orders, addresses, wallet, payment-methods, coupons, notifications, sessions
- **Driver API**: orders, documents, earnings, services, settings

**Authentication**: All protected routes use `@UseGuards(JwtAuthGuard)` with Passport-JWT.

### Mobile App Pattern (Expo Router)
```
app/
├── (auth)/          # Login, signup screens
├── (main)/          # Main app screens
├── _layout.tsx      # Root layout with providers
└── index.tsx        # Entry point

lib/
├── api.ts           # Axios instance with token interceptor
└── socket.ts        # Socket.IO service singleton

stores/              # Zustand stores
├── auth-store.ts    # User + tokens
├── booking-store.ts # Active ride state
└── theme-store.ts   # Theme preferences
```

**State**: Zustand with Expo Secure Store persistence (localStorage on web).
**API**: Axios with automatic token refresh on 401.
**Styling**: NativeWind (Tailwind CSS for React Native).

### Socket.IO Architecture

**Connection**: Mobile apps connect to socket-api at path `/socket-api/socket.io`:
```typescript
io(SOCKET_URL, {
  path: '/socket-api/socket.io',
  auth: { token, type: 'rider' | 'driver' },
  transports: ['polling', 'websocket'],
});
```

**Room naming conventions** (defined in `packages/socket/src/rooms.ts`):
- `order:{orderId}` - Order participants (driver + rider)
- `driver:{driverId}` - Individual driver room
- `rider:{riderId}` - Individual rider room
- `drivers` / `riders` / `admins` - Client type groups

**Key events**:
- `driver:online` / `driver:offline` - Driver availability
- `driver:location` - Driver position updates (broadcasts to order room)
- `order:status` - Order status changes
- `order:accept` - Driver accepts order
- `join:order` / `leave:order` - Room management
- `chat:send` / `chat:message` - In-ride messaging

**DriverTracker** (`packages/socket/src/rooms.ts`): In-memory store tracking online drivers with location, services, and socket IDs.

**DispatchService** (`apps/admin-api/src/socket/dispatch.service.ts`): Handles order routing logic - finds nearby drivers, sends offers sequentially with 15s timeout per driver, handles accept/reject/timeout.

### Database (Prisma)
Schema: `packages/database/prisma/schema.prisma`

**Order Status Flow**:
`Requested` → `Found` → `DriverAccepted` → `Arrived` → `Started` → `WaitingForPostPay` → `Finished`

Alternative endings: `NotFound`, `NoCloseFound`, `DriverCanceled`, `RiderCanceled`, `Expired`

**Booked orders**: Status `Booked` for scheduled rides.

**After schema changes**: Run `npm run db:generate` then `npm run db:push`.

### Environment Variables

**Backend APIs** (`.env` in root):
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - JWT signing secret
- `PORT` - Override default port

**Mobile Apps** (via `eas.json` or local):
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_SOCKET_URL` - Socket.IO server URL
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key

## Key Patterns

### Adding a New API Endpoint
1. Create/update DTO in `src/{module}/dto/`
2. Add method to `{module}.service.ts`
3. Add route in `{module}.controller.ts`
4. Use `@UseGuards(JwtAuthGuard)` for protected routes

### Adding a Mobile Screen
1. Create file in `app/(main)/screen-name.tsx`
2. Expo Router auto-registers the route
3. Use Zustand stores for state
4. Use React Query for data fetching

### Socket Event Flow
1. Define event types in `packages/socket/src/types.ts`
2. Emit from `apps/socket-api` via `SocketGateway` methods (`emitToDriver`, `emitToRider`, `emitToOrder`)
3. Listen in mobile app via `socketService.on(event, callback)`

### Payment Processing
Payment gateways abstracted in `packages/shared`. Supported: Stripe, PayPal, Razorpay, Paystack, Flutterwave, SkipCash.

### i18n
Mobile apps support Arabic (RTL) and English via i18next. Translations in `i18n/` or `locales/` directories.

## Troubleshooting

**"Prisma Client not generated"**: Run `npm run db:generate`

**Port in use**: `lsof -ti:3000 | xargs kill -9`

**Mobile app can't connect to API**: Use machine's IP address (not localhost) for physical devices. Ensure same Wi-Fi network.

**Socket connection fails**: Verify socket-api is running on port 3004. Check JWT token validity.

### Database Commands (Production Server)

**Note**: Prisma uses lowercase table names (e.g., `orders` not `Order`).

```bash
# Connect to MySQL
mysql -u root -p wasel

# Check order status
SELECT id, status, finishedAt, createdAt FROM orders WHERE id = 51;

# Fix stuck order (mark as finished)
UPDATE orders SET status = 'Finished', finishedAt = NOW() WHERE id = 51;

# Find all active/stuck orders
SELECT id, status, customerId, driverId, createdAt
FROM orders
WHERE status IN ('Requested', 'DriverAccepted', 'Arrived', 'Started')
ORDER BY createdAt DESC;

# Check driver status
SELECT id, firstName, lastName, status FROM drivers WHERE id = 5;

# Set driver back online
UPDATE drivers SET status = 'online' WHERE id = 5;

# List all tables
SHOW TABLES;
```

**Order Statuses**: `Requested`, `Found`, `NoCloseFound`, `NotFound`, `DriverAccepted`, `Arrived`, `Started`, `WaitingForPostPay`, `WaitingForPrePay`, `WaitingForReview`, `Finished`, `DriverCanceled`, `RiderCanceled`, `Expired`, `Booked`

**Driver Statuses**: `online`, `offline`, `in_ride`, `waiting_documents`, `pending_approval`, `soft_reject`, `hard_reject`, `blocked`
