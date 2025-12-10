# Taxi Platform - Implementation Plan

**Updated:** 2025-11-28
**Status:** Backend APIs Complete - Ready for Frontend Development

---

## Project Overview

Building a production-ready taxi platform for a single city with:
- Full platform features
- Fleet management for taxi companies
- In-app chat between rider and driver
- Scheduled rides (book for future)
- Complex admin with roles/permissions
- React Native mobile apps
- Fake payment now, SkipCash integration for production

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS + REST API |
| Database | MySQL + Prisma ORM |
| Monorepo | Turborepo |
| Real-time | Socket.io |
| Mobile | React Native (Expo) |
| Admin Panel | React + Vite |
| Auth | JWT (Passport) |
| File Storage | Local (dev) / S3 (prod) |
| Push Notifications | Firebase Cloud Messaging |
| SMS | Twilio / local provider |
| Email | SendGrid / SES |

---

## Architecture

```
taxi-platform/
├── apps/
│   ├── admin-api/          # Admin backend (NestJS) - port 3000
│   ├── rider-api/          # Customer app backend (NestJS) - port 3001
│   ├── driver-api/         # Driver app backend (NestJS) - port 3002
│   ├── admin-panel/        # Admin dashboard (React + Vite)
│   ├── rider-app/          # Customer mobile (React Native)
│   └── driver-app/         # Driver mobile (React Native)
├── packages/
│   ├── database/           # Prisma schema & client
│   ├── shared/             # Shared types & utilities
│   └── socket/             # Socket.io shared logic
```

---

# IMPLEMENTATION PHASES

---

## PHASE 1: Foundation (COMPLETED)

### 1.1 Project Setup
- [x] Initialize Turborepo monorepo
- [x] Create shared database package with Prisma
- [x] Configure TypeScript across all apps
- [x] Setup environment variables

### 1.2 Basic APIs
- [x] admin-api with JWT auth
- [x] rider-api with JWT auth
- [x] driver-api with JWT auth

### 1.3 Basic Database
- [x] customers table
- [x] drivers table
- [x] operators table
- [x] orders table
- [x] services table

---

## PHASE 2: Enhanced Database Schema (COMPLETED)

### 2.1 Apply Enhanced Schema
**Files:** `packages/database/prisma/schema.prisma`

**Tasks:**
- [x] Write enhanced schema with 40+ tables
- [x] Run `npm run db:push` to apply schema ✅ (2025-11-26)
- [x] Run `npm run db:generate` to regenerate client ✅ (auto-generated)
- [x] Verify all tables created in MySQL ✅ (49 tables created)

**Tables by Domain:**

| Domain | Tables |
|--------|--------|
| Customer | customers, customer_addresses, customer_transactions, customer_sessions, customer_notes, favorite_drivers, blocked_drivers |
| Driver | drivers, driver_documents, document_types, driver_transactions, driver_sessions, driver_services, car_models, car_colors |
| Service | services, service_categories, service_options, zone_prices, regions |
| Fleet | fleets, fleet_transactions |
| Order | orders, order_messages, order_activities, order_notes, order_service_options, cancel_reasons |
| Payment | payment_gateways, saved_payment_methods, coupons, coupon_usage |
| Support | support_requests, support_activities, feedbacks, feedback_parameters |
| System | media, announcements, settings, app_versions, notifications |

### 2.2 Seed Initial Data (COMPLETED)
**Files:** `packages/database/prisma/seed.ts`

**Tasks:**
- [x] Create seed script ✅ (2025-11-27)
- [x] Seed document types (6: License, Registration, Insurance, Profile Photo, Vehicle Photos)
- [x] Seed cancel reasons (12: 6 for riders, 6 for drivers)
- [x] Seed car models (10: Toyota, Honda, Nissan, Hyundai, Kia, BMW, Mercedes, Lexus)
- [x] Seed car colors (10: Black, White, Silver, Gray, Red, Blue, Green, Brown, Beige, Gold)
- [x] Seed default services (3: Economy, Premium, XL with pricing)
- [x] Seed service category (Taxi)
- [x] Seed default settings (10: currency, timezone, commission, timeouts, etc.)
- [x] Seed review parameters (8: 4 good, 4 bad)
- [x] Create default super admin (`admin@taxi.com` / `Admin123!`)
- [x] Create cash payment gateway

**Seeded Data Summary:**
| Table | Count | Details |
|-------|-------|---------|
| document_types | 6 | Driver's License, Vehicle Registration, Insurance, Profile Photo, Vehicle Photos |
| car_models | 10 | Toyota Camry/Corolla, Honda Accord/Civic, Nissan Altima, etc. |
| car_colors | 10 | Black, White, Silver, Gray, Red, Blue, Green, Brown, Beige, Gold |
| order_cancel_reasons | 12 | 6 rider reasons, 6 driver reasons |
| services | 3 | Economy ($3 base), Premium ($5 base), XL ($7 base) |
| service_categories | 1 | Taxi |
| settings | 10 | Currency (USD), Commission (20%), Timeouts, etc. |
| review_parameters | 8 | Professional driver, Clean vehicle, Bad route, etc. |
| operators | 1 | Super Admin |
| payment_gateways | 1 | Cash Payment |

### 2.3 API Compatibility Fixes (COMPLETED)
**Issue:** After applying the enhanced schema, the existing API code had TypeScript errors due to field name changes.

**Errors Found & Fixed:**

#### Error 1: drivers.service.ts - carModel/carColor Type Mismatch
```
Type 'string' is not assignable to type 'CarModelCreateNestedOneWithoutDriversInput'
```
**Cause:** Old code used `carModel: string`, new schema uses `carModelId: Int` (foreign key)
**Fix:** Changed `carModel/carColor` to `carModelId/carColorId` (integer IDs)
**Files:** `apps/admin-api/src/drivers/drivers.service.ts`, `drivers.controller.ts`

#### Error 2: services.service.ts - sortOrder Field Missing
```
'sortOrder' does not exist in type 'ServiceOrderByWithRelationInput'
```
**Cause:** Old code used `sortOrder`, new schema uses `displayPriority`
**Fix:** Changed `orderBy: { sortOrder: 'asc' }` to `orderBy: { displayPriority: 'asc' }`
**Files:** `apps/admin-api/src/services/services.service.ts`

#### Error 3: services.controller.ts - Old Pricing Fields
```
Type is missing properties: perHundredMeters, perMinuteDrive
```
**Cause:** Old code used `perKmRate/perMinuteRate`, new schema uses granular pricing
**Fix:** Updated field names to match new schema:
| Old Field | New Field |
|-----------|-----------|
| `perKmRate` | `perHundredMeters` |
| `perMinuteRate` | `perMinuteDrive` |
| *(none)* | `perMinuteWait` |
| *(none)* | `minimumFare` |
| *(none)* | `personCapacity` |
| *(none)* | `displayPriority` |

**Files:** `apps/admin-api/src/services/services.service.ts`, `services.controller.ts`

**Verification:**
- [x] Admin API compiles with 0 errors
- [x] Login endpoint works (`admin@taxi.com` / `Admin123!`)
- [x] Services endpoint returns all 3 services with categories
- [x] Drivers endpoint supports car model/color relations

---

## PHASE 3: Admin API Enhancement (COMPLETED)

### 3.1 Dashboard Module
**Files:** `apps/admin-api/src/dashboard/`

**Endpoints:**
- [x] `GET /api/dashboard/stats` - Overview statistics
- [x] `GET /api/dashboard/charts` - Chart data (orders by day/week)
- [x] `GET /api/dashboard/live` - Active orders, online drivers

**Tasks:**
- [x] Create dashboard.module.ts
- [x] Create dashboard.controller.ts
- [x] Create dashboard.service.ts
- [x] Implement stats query (total orders, revenue, users)
- [x] Implement time-series chart data
- [x] Implement live data endpoint

### 3.2 Drivers Module Enhancement
**Files:** `apps/admin-api/src/drivers/`

**Endpoints:**
- [x] `GET /api/drivers` - List with filters (status, fleet, search)
- [x] `GET /api/drivers/:id` - Full driver details
- [x] `POST /api/drivers` - Create driver with car info
- [x] `PATCH /api/drivers/:id` - Update driver
- [x] `DELETE /api/drivers/:id` - Soft delete driver
- [x] `PATCH /api/drivers/:id/approve` - Approve driver
- [x] `PATCH /api/drivers/:id/reject` - Reject driver
- [x] `GET /api/drivers/:id/documents` - List documents
- [x] `PATCH /api/drivers/:id/documents/:docId` - Verify document
- [x] `GET /api/drivers/:id/wallet` - Wallet balance
- [x] `GET /api/drivers/:id/transactions` - Transaction history
- [x] `POST /api/drivers/:id/wallet/adjust` - Add/deduct balance
- [x] `GET /api/drivers/:id/orders` - Order history
- [x] `POST /api/drivers/:id/notes` - Add admin note

**Tasks:**
- [x] Update drivers.service.ts with all methods
- [x] Update drivers.controller.ts with all endpoints
- [x] Create DTOs for all request/response
- [x] Add pagination and filtering

### 3.3 Customers Module Enhancement
**Files:** `apps/admin-api/src/customers/`

**Endpoints:**
- [x] `GET /api/customers` - List with filters
- [x] `GET /api/customers/:id` - Full customer details
- [x] `PATCH /api/customers/:id` - Update customer
- [x] `PATCH /api/customers/:id/status` - Enable/disable
- [x] `GET /api/customers/:id/wallet` - Wallet balance
- [x] `GET /api/customers/:id/transactions` - Transaction history
- [x] `POST /api/customers/:id/wallet/adjust` - Add/deduct balance
- [x] `GET /api/customers/:id/orders` - Order history
- [x] `GET /api/customers/:id/addresses` - Saved addresses
- [x] `POST /api/customers/:id/notes` - Add admin note

### 3.4 Orders Module Enhancement
**Files:** `apps/admin-api/src/orders/`

**Endpoints:**
- [x] `GET /api/orders` - List with filters (date, status, driver, customer)
- [x] `GET /api/orders/:id` - Full order details with timeline
- [x] `PATCH /api/orders/:id/status` - Update status
- [x] `PATCH /api/orders/:id/assign` - Manual assign driver
- [x] `POST /api/orders/:id/notes` - Add admin note
- [x] `GET /api/orders/:id/messages` - View chat history
- [x] `POST /api/orders/:id/refund` - Process refund
- [x] `GET /api/orders/stats` - Order statistics

### 3.5 Fleets Module
**Files:** `apps/admin-api/src/fleets/`

**Endpoints:**
- [x] `GET /api/fleets` - List all fleets
- [x] `POST /api/fleets` - Create fleet
- [x] `GET /api/fleets/:id` - Fleet details
- [x] `PATCH /api/fleets/:id` - Update fleet
- [x] `DELETE /api/fleets/:id` - Delete fleet
- [x] `GET /api/fleets/:id/drivers` - Fleet's drivers
- [x] `POST /api/fleets/:id/drivers` - Add driver to fleet
- [x] `DELETE /api/fleets/:id/drivers/:driverId` - Remove driver
- [x] `GET /api/fleets/:id/wallet` - Fleet wallet
- [x] `GET /api/fleets/:id/transactions` - Fleet transactions

**Tasks:**
- [x] Create fleets.module.ts
- [x] Create fleets.controller.ts
- [x] Create fleets.service.ts
- [x] Create DTOs

### 3.6 Services Module Enhancement
**Files:** `apps/admin-api/src/services/`

**Endpoints:**
- [x] `GET /api/services` - List services
- [x] `POST /api/services` - Create service
- [x] `PATCH /api/services/:id` - Update service
- [x] `DELETE /api/services/:id` - Delete service
- [x] `GET /api/service-categories` - List categories
- [x] `POST /api/service-categories` - Create category
- [x] `GET /api/service-options` - List options
- [x] `POST /api/service-options` - Create option
- [x] `GET /api/zone-prices` - List zone prices
- [x] `POST /api/zone-prices` - Create zone price

### 3.7 Coupons Module
**Files:** `apps/admin-api/src/coupons/`

**Endpoints:**
- [x] `GET /api/coupons` - List coupons
- [x] `POST /api/coupons` - Create coupon
- [x] `GET /api/coupons/:id` - Coupon details
- [x] `PATCH /api/coupons/:id` - Update coupon
- [x] `DELETE /api/coupons/:id` - Delete coupon
- [x] `GET /api/coupons/:id/usage` - Usage statistics

**Tasks:**
- [x] Create coupons.module.ts
- [x] Create coupons.controller.ts
- [x] Create coupons.service.ts

### 3.8 Support Module
**Files:** `apps/admin-api/src/support/`

**Endpoints:**
- [x] `GET /api/support-requests` - List tickets
- [x] `GET /api/support-requests/:id` - Ticket details
- [x] `PATCH /api/support-requests/:id` - Update status
- [x] `POST /api/support-requests/:id/respond` - Add response

**Tasks:**
- [x] Create support.module.ts
- [x] Create support.controller.ts
- [x] Create support.service.ts

### 3.9 Settings Module
**Files:** `apps/admin-api/src/settings/`

**Endpoints:**
- [x] `GET /api/settings` - Get all settings
- [x] `PATCH /api/settings` - Update settings
- [x] `GET /api/car-models` - List car models
- [x] `POST /api/car-models` - Create car model
- [x] `GET /api/car-colors` - List car colors
- [x] `POST /api/car-colors` - Create car color
- [x] `GET /api/document-types` - List document types
- [x] `POST /api/document-types` - Create document type
- [x] `GET /api/cancel-reasons` - List cancel reasons
- [x] `POST /api/cancel-reasons` - Create cancel reason

**Tasks:**
- [x] Create settings.module.ts
- [x] Create settings.controller.ts
- [x] Create settings.service.ts

### 3.10 Operators Module
**Files:** `apps/admin-api/src/operators/`

**Endpoints:**
- [x] `GET /api/operators` - List operators
- [x] `POST /api/operators` - Create operator
- [x] `GET /api/operators/:id` - Operator details
- [x] `PATCH /api/operators/:id` - Update operator
- [x] `DELETE /api/operators/:id` - Delete operator
- [x] `GET /api/roles` - List roles
- [x] `POST /api/roles` - Create role
- [x] `PATCH /api/roles/:id` - Update role permissions

**Tasks:**
- [x] Create operators.module.ts
- [x] Create operators.controller.ts
- [x] Create operators.service.ts
- [x] Implement role-based guards

---

## PHASE 4: Rider API Enhancement (COMPLETED)

### 4.1 Auth Enhancement
**Files:** `apps/rider-api/src/auth/`

**Endpoints:**
- [x] `POST /api/auth/register` - Register with phone
- [x] `POST /api/auth/verify-otp` - Verify OTP
- [x] `POST /api/auth/resend-otp` - Resend OTP
- [x] `POST /api/auth/login` - Login
- [x] `GET /api/auth/profile` - Get profile
- [x] `PATCH /api/auth/profile` - Update profile
- [x] `POST /api/auth/profile/avatar` - Upload avatar
- [x] `DELETE /api/auth/account` - Delete account

### 4.2 Addresses Module
**Files:** `apps/rider-api/src/addresses/`

**Endpoints:**
- [x] `GET /api/addresses` - List saved addresses
- [x] `POST /api/addresses` - Add address
- [x] `PATCH /api/addresses/:id` - Update address
- [x] `DELETE /api/addresses/:id` - Delete address

**Tasks:**
- [x] Create addresses.module.ts
- [x] Create addresses.controller.ts
- [x] Create addresses.service.ts

### 4.3 Orders Enhancement
**Files:** `apps/rider-api/src/orders/`

**Endpoints:**
- [x] `GET /api/orders/services` - Available services
- [x] `POST /api/orders/calculate` - Get fare estimate
- [x] `POST /api/orders` - Create order
- [x] `GET /api/orders` - My orders (history)
- [x] `GET /api/orders/:id` - Order details
- [x] `GET /api/orders/:id/track` - Real-time tracking
- [x] `PATCH /api/orders/:id/cancel` - Cancel order
- [x] `POST /api/orders/:id/rate` - Rate driver
- [x] `POST /api/orders/:id/tip` - Add tip

### 4.4 Chat Module
**Files:** `apps/rider-api/src/chat/`

**Endpoints:**
- [x] `GET /api/orders/:id/messages` - Get chat messages
- [x] `POST /api/orders/:id/messages` - Send message

**Tasks:**
- [x] Create chat.module.ts
- [x] Create chat.controller.ts
- [x] Create chat.service.ts

### 4.5 Wallet Module
**Files:** `apps/rider-api/src/wallet/`

**Endpoints:**
- [x] `GET /api/wallet` - Wallet balance
- [x] `GET /api/wallet/transactions` - Transaction history
- [x] `POST /api/wallet/topup` - Top up wallet

**Tasks:**
- [x] Create wallet.module.ts
- [x] Create wallet.controller.ts
- [x] Create wallet.service.ts

### 4.6 Payment Methods Module
**Files:** `apps/rider-api/src/payment-methods/`

**Endpoints:**
- [x] `GET /api/payment-methods` - Saved cards
- [x] `POST /api/payment-methods` - Add card
- [x] `DELETE /api/payment-methods/:id` - Remove card

### 4.7 Coupons Module
**Files:** `apps/rider-api/src/coupons/`

**Endpoints:**
- [x] `GET /api/coupons` - Available coupons
- [x] `POST /api/coupons/apply` - Apply coupon
- [x] `GET /api/coupons/validate` - Validate coupon

### 4.8 Scheduled Rides
**Files:** `apps/rider-api/src/scheduled/`

**Endpoints:**
- [x] `POST /api/orders/schedule` - Book scheduled ride
- [x] `GET /api/orders/scheduled` - My scheduled rides
- [x] `DELETE /api/orders/scheduled/:id` - Cancel scheduled ride

---

## PHASE 5: Driver API Enhancement (COMPLETED)

### 5.1 Auth Enhancement
**Files:** `apps/driver-api/src/auth/`

**Endpoints:**
- [x] `POST /api/auth/register` - Driver registration
- [x] `POST /api/auth/verify-otp` - Verify OTP
- [x] `POST /api/auth/login` - Login
- [x] `GET /api/auth/profile` - Get profile
- [x] `PATCH /api/auth/profile` - Update profile
- [x] `PATCH /api/auth/status` - Go online/offline
- [x] `PATCH /api/auth/location` - Update location

### 5.2 Documents Module
**Files:** `apps/driver-api/src/documents/`

**Endpoints:**
- [x] `GET /api/documents/required` - Required documents list
- [x] `GET /api/documents/my` - My uploaded documents
- [x] `POST /api/documents` - Upload document
- [x] `DELETE /api/documents/:id` - Delete document

**Tasks:**
- [x] Create documents.module.ts
- [x] Create documents.controller.ts
- [x] Create documents.service.ts

### 5.3 Orders Enhancement
**Files:** `apps/driver-api/src/orders/`

**Endpoints:**
- [x] `GET /api/orders/available` - Available orders nearby
- [x] `GET /api/orders/current` - Current active order
- [x] `GET /api/orders/my` - Order history
- [x] `POST /api/orders/:id/accept` - Accept order
- [x] `POST /api/orders/:id/reject` - Reject order
- [x] `PATCH /api/orders/:id/arrived` - Arrived at pickup
- [x] `PATCH /api/orders/:id/start` - Start ride
- [x] `PATCH /api/orders/:id/complete` - Complete ride
- [x] `PATCH /api/orders/:id/cancel` - Cancel order

### 5.4 Chat Module
**Files:** `apps/driver-api/src/chat/`

**Endpoints:**
- [x] `GET /api/orders/:id/messages` - Get chat messages
- [x] `POST /api/orders/:id/messages` - Send message

### 5.5 Earnings Module
**Files:** `apps/driver-api/src/earnings/`

**Endpoints:**
- [x] `GET /api/earnings/today` - Today's earnings
- [x] `GET /api/earnings/week` - This week's earnings
- [x] `GET /api/earnings/history` - Earnings history
- [x] `GET /api/wallet` - Wallet balance
- [x] `GET /api/wallet/transactions` - Transaction history
- [x] `POST /api/wallet/withdraw` - Request withdrawal

**Tasks:**
- [x] Create earnings.module.ts
- [x] Create earnings.controller.ts
- [x] Create earnings.service.ts

### 5.6 Services Module
**Files:** `apps/driver-api/src/services/`

**Endpoints:**
- [x] `GET /api/services/my` - My enabled services
- [x] `PATCH /api/services/my` - Enable/disable services

---

## PHASE 6: Real-Time (Socket.io) (COMPLETED)

### 6.1 Socket Server Setup
**Files:** `packages/socket/`

**Tasks:**
- [x] Create socket package structure
- [x] Setup Socket.io server
- [x] Implement JWT authentication middleware
- [x] Create room management (order rooms, driver rooms)

### 6.2 Driver Events
**Events:**
- [x] `driver:connect` - Driver connects
- [x] `driver:disconnect` - Driver disconnects
- [x] `driver:location` - Location update broadcast
- [x] `driver:status` - Online/offline status
- [x] `driver:order-offer` - New order notification
- [x] `driver:order-timeout` - Order offer expired

### 6.3 Rider Events
**Events:**
- [x] `rider:connect` - Rider connects
- [x] `rider:order-status` - Order status update
- [x] `rider:driver-location` - Driver location update
- [x] `rider:driver-assigned` - Driver accepted order
- [x] `rider:eta-update` - ETA update

### 6.4 Chat Events
**Events:**
- [x] `chat:join` - Join order chat room
- [x] `chat:message` - New message
- [x] `chat:typing` - Typing indicator
- [x] `chat:read` - Message read receipt

### 6.5 Integration
**Tasks:**
- [x] Integrate socket server with admin-api
- [x] Integrate socket server with rider-api
- [x] Integrate socket server with driver-api
- [ ] Add Redis adapter for scaling (optional)

---

## PHASE 7: Payment Integration (COMPLETED)

### 7.1 Fake Payment Gateway
**Files:** `packages/shared/src/payment/`

**Tasks:**
- [x] Create abstract PaymentGateway interface
- [x] Implement FakePaymentGateway
- [x] Simulate card validation
- [x] Simulate charge success/failure
- [x] Simulate refund

### 7.2 Wallet System
**Tasks:**
- [x] Implement wallet top-up flow
- [x] Implement wallet payment for rides
- [x] Implement automatic deduction
- [x] Implement refund to wallet

### 7.3 Commission System
**Tasks:**
- [x] Implement platform commission calculation
- [x] Implement fleet commission calculation
- [x] Implement driver payout calculation
- [x] Create commission reports

### 7.4 SkipCash Preparation
**Tasks:**
- [x] Create SkipCashGateway interface
- [x] Document SkipCash API requirements
- [ ] Prepare webhook handlers (production only)

---

## PHASE 8: Admin Panel (React) (COMPLETED)

### 8.1 Project Setup
**Files:** `apps/admin-panel/`
**Note:** Used Next.js instead of React + Vite for better SSR and routing

**Tasks:**
- [x] Initialize Next.js project
- [x] Setup TailwindCSS
- [x] Setup App Router
- [x] Setup React Query (TanStack Query)
- [x] Setup Axios with interceptors
- [x] Create authentication context
- [x] Create protected routes

### 8.2 Layout & Components
**Tasks:**
- [x] Create Sidebar component
- [x] Create Header component (Breadcrumbs)
- [x] Create main layout
- [x] Create reusable Table component
- [x] Create reusable Modal component
- [x] Create reusable Form components
- [x] Create pagination component
- [x] Create filter components
- [x] Create ConfirmDialog component
- [x] Create Toast notifications
- [x] Create DateRangePicker component
- [x] Create OrderDetailsModal component

### 8.3 Dashboard Page
**Tasks:**
- [x] Stats cards (orders, revenue, users)
- [x] Orders chart (line/bar)
- [ ] Live map with drivers (Future)
- [x] Recent orders list
- [ ] Alerts section (Future)

### 8.4 Drivers Pages
**Tasks:**
- [x] Drivers list with filters
- [ ] Driver details page (Future)
- [x] Document verification UI
- [x] Approval workflow UI
- [ ] Wallet management UI (Future)
- [x] Create/Edit driver form

### 8.5 Customers Pages
**Tasks:**
- [x] Customers list with filters
- [ ] Customer details page (Future)
- [ ] Order history view (Future)
- [ ] Wallet management UI (Future)
- [x] Create/Edit customer form
- [x] Bulk actions (multi-select, bulk delete)

### 8.6 Orders Pages
**Tasks:**
- [x] Orders list with filters
- [x] Order details modal
- [x] Order timeline view
- [ ] Live orders map view (Future)
- [ ] Manual dispatch UI (Future)
- [x] Date range filters
- [x] CSV export

### 8.7 Fleets Pages
**Tasks:**
- [x] Fleets list
- [ ] Fleet details page (Future)
- [ ] Fleet drivers management (Future)
- [ ] Fleet finances view (Future)
- [x] Create/Edit fleet form
- [x] CSV export

### 8.8 Services Pages
**Tasks:**
- [x] Services list
- [x] Service create/edit form
- [ ] Categories management (Future)
- [ ] Options management (Future)
- [ ] Zone pricing UI (Future)

### 8.9 Coupons Pages
**Tasks:**
- [x] Coupons list
- [x] Coupon create/edit form
- [ ] Usage statistics view (Future)

### 8.10 Support Pages
**Tasks:**
- [x] Support tickets list
- [x] Ticket details & response UI

### 8.11 Settings Pages
**Tasks:**
- [x] General settings form
- [ ] Car models/colors management (Future)
- [ ] Document types management (Future)
- [ ] Cancel reasons management (Future)

### 8.12 Operators Pages
**Tasks:**
- [x] Operators list
- [x] Operator create/edit form
- [ ] Roles management (Future)
- [ ] Permission matrix UI (Future)

### 8.13 Additional Features (Bonus)
**Tasks:**
- [x] Dark mode toggle (light/dark/system)
- [x] Profile page with password change
- [x] CSV export for all major pages
- [x] Breadcrumbs navigation
- [x] Toast notifications system
- [x] Error handling with user-friendly messages
- [x] Loading states and skeletons

---

## PHASE 9: React Native Mobile Apps

### 9.1 Rider App Setup
**Files:** `apps/rider-app/`

**Tasks:**
- [ ] Initialize Expo project
- [ ] Setup navigation (React Navigation)
- [ ] Setup state management (Zustand/Redux)
- [ ] Setup API client
- [ ] Configure push notifications
- [ ] Setup maps (react-native-maps)

### 9.2 Rider App Screens
**Screens:**
- [ ] Splash Screen
- [ ] Onboarding (3 slides)
- [ ] Login (phone input)
- [ ] OTP Verification
- [ ] Register (name, email)
- [ ] Home (map + service selection)
- [ ] Location Search
- [ ] Confirm Booking
- [ ] Finding Driver
- [ ] Driver Assigned (tracking)
- [ ] Ride In Progress
- [ ] Ride Complete
- [ ] Rating
- [ ] Payment
- [ ] Order History
- [ ] Order Details
- [ ] Profile
- [ ] Edit Profile
- [ ] Wallet
- [ ] Add Money
- [ ] Saved Addresses
- [ ] Scheduled Rides
- [ ] Support
- [ ] Settings

### 9.3 Driver App Setup
**Files:** `apps/driver-app/`

**Tasks:**
- [ ] Initialize Expo project
- [ ] Setup navigation
- [ ] Setup state management
- [ ] Setup API client
- [ ] Configure push notifications
- [ ] Setup maps
- [ ] Setup background location

### 9.4 Driver App Screens
**Screens:**
- [ ] Splash Screen
- [ ] Login (phone input)
- [ ] OTP Verification
- [ ] Register
- [ ] Document Upload
- [ ] Pending Approval
- [ ] Home (Go Online toggle)
- [ ] New Order Popup
- [ ] Navigate to Pickup
- [ ] Arrived at Pickup
- [ ] Ride In Progress
- [ ] Navigate to Destination
- [ ] Complete Ride
- [ ] Earnings Today
- [ ] Earnings History
- [ ] Order History
- [ ] Order Details
- [ ] Wallet
- [ ] Withdraw
- [ ] Profile
- [ ] Documents
- [ ] Settings

---

## PHASE 10: Notifications System

### 10.1 Notification Service
**Files:** `packages/shared/src/notifications/`

**Tasks:**
- [ ] Create NotificationService
- [ ] Integrate Firebase Admin SDK
- [ ] Create SMS service (Twilio)
- [ ] Create Email service (SendGrid)
- [ ] Create notification templates

### 10.2 Push Notifications
**Tasks:**
- [ ] Setup FCM for iOS
- [ ] Setup FCM for Android
- [ ] Store device tokens
- [ ] Implement push sending

### 10.3 In-App Notifications
**Tasks:**
- [ ] Create notifications table
- [ ] Create notification endpoints
- [ ] Implement Socket.io delivery
- [ ] Implement notification preferences

---

## PHASE 11: Testing & Documentation

### 11.1 API Testing
**Tasks:**
- [ ] Write unit tests for services
- [ ] Write integration tests for endpoints
- [ ] Setup test database
- [ ] Configure CI/CD testing

### 11.2 API Documentation
**Tasks:**
- [ ] Setup Swagger/OpenAPI
- [ ] Document all endpoints
- [ ] Create Postman collection

### 11.3 Mobile Testing
**Tasks:**
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on physical devices

---

## PHASE 12: Deployment & Production

### 12.1 Backend Deployment
**Tasks:**
- [ ] Setup production database
- [ ] Configure environment variables
- [ ] Deploy APIs to server
- [ ] Setup SSL certificates
- [ ] Configure domain

### 12.2 Admin Panel Deployment
**Tasks:**
- [ ] Build production bundle
- [ ] Deploy to hosting
- [ ] Configure CDN

### 12.3 Mobile App Release
**Tasks:**
- [ ] Configure app signing
- [ ] Build production APK/IPA
- [ ] Submit to App Store
- [ ] Submit to Play Store

### 12.4 SkipCash Integration
**Tasks:**
- [ ] Implement SkipCash API
- [ ] Test payment flow
- [ ] Go live with payments

---

# BUSINESS LOGIC

## Order Dispatch
- **Method:** One-by-One (send to closest driver first)
- **Timeout:** 15 seconds per driver
- **Flow:** If rejected/timeout → send to next closest → repeat until accepted or no drivers

## Payment Options
- **Cash:** Driver collects, commission deducted from driver wallet
- **Wallet:** Rider tops up via SkipCash, auto-deducted on ride complete
- **Card:** Saved cards via SkipCash, charged on ride complete

## Fare Calculation
- **Fixed Price:** For services like Airport Transfer, price set at booking
- **Metered:** Final price = Base + (Distance × Rate) + (Time × Rate) + Wait
- **Per Service:** Each service can be configured as Fixed or Metered

## Cancellation Policy
- **Configurable per service** in admin panel
- Settings: Is Cancellable, Free Window (minutes), Fee Amount, Driver Share
- Example: Economy = Yes, 2min free, $3 fee | Airport = Not cancellable

## Scheduled Rides
- **Type:** Driver Pre-Assigned (guaranteed driver)
- **Flow:** Book → Driver assigned immediately → Reminder 1hr before → Ride

---

# ADMIN ROLES & PERMISSIONS

| Role | Description |
|------|-------------|
| **Super Admin** | Full system access |
| **Admin** | Day-to-day operations, no system settings |
| **Fleet Manager** | Only their fleet's drivers/orders |
| **Support Agent** | View orders, handle tickets |
| **Finance** | Transactions, payouts, reports |
| **Dispatcher** | Orders, drivers location, manual assign |

---

# NOTIFICATION EVENTS

## Rider Notifications
| Event | Push | SMS | Email |
|-------|------|-----|-------|
| OTP Code | - | ✓ | - |
| Driver Assigned | ✓ | - | - |
| Driver Arrived | ✓ | - | - |
| Ride Completed | ✓ | - | ✓ |
| Scheduled Reminder | ✓ | ✓ | - |

## Driver Notifications
| Event | Push | SMS | Email |
|-------|------|-----|-------|
| New Order Request | ✓ | - | - |
| Order Cancelled | ✓ | - | - |
| Scheduled Ride | ✓ | ✓ | - |
| Payout Processed | ✓ | - | ✓ |
| Document Status | ✓ | ✓ | ✓ |

---

# COMMANDS

```bash
npm run admin-api    # Start admin API (port 3000)
npm run rider-api    # Start rider API (port 3001)
npm run driver-api   # Start driver API (port 3002)
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

---

# DECISIONS MADE

| Question | Answer |
|----------|--------|
| Market | Single city |
| MVP Scope | Full platform |
| Admin Users | Full organization (roles) |
| Mobile Tech | React Native (Expo) |
| Features | Chat, Fleet, Scheduled (NO SOS) |
| Payment | Fake now, SkipCash later |
| Timeline | Production ready |
