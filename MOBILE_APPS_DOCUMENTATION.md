# Mobile Apps Documentation - Before Rebuild

## Overview
This document captures the complete state of the rider-app and driver-app before rebuilding them from scratch with Expo.

---

## 1. Rider App (`apps/rider-app`)

### Purpose
Passenger-facing mobile app for booking taxi rides.

### Key Features Implemented
1. **Authentication** - Login/Signup screens with phone/email
2. **Home Screen** - Map view with location search
3. **Ride Booking** - Pickup/destination selection, fare estimation
4. **Ride Tracking** - Real-time driver tracking during rides
5. **Ride History** - Past rides list
6. **Profile** - User profile management

### Screen Structure
```
src/screens/
├── LoginScreen.tsx        - User login
├── SignupScreen.tsx       - New user registration
├── HomeScreen.tsx         - Main map + booking interface
├── RideHistoryScreen.tsx  - Past rides
├── ProfileScreen.tsx      - User settings
├── RideTrackingScreen.tsx - Active ride tracking
└── FareEstimateScreen.tsx - Price estimation before booking
```

### Navigation Structure
- Stack Navigator for auth flow (Login -> Signup)
- Tab Navigator for main app (Home, History, Profile)
- Modal screens for ride booking flow

### Key Components
```
src/components/
├── CrossPlatformMap.tsx      - Native map (react-native-maps)
├── CrossPlatformMap.web.tsx  - Web placeholder map
├── LocationSearch.tsx        - Address autocomplete
├── RideCard.tsx              - Ride summary card
└── DriverInfo.tsx            - Driver details during ride
```

### API Integration
- Backend URL: `http://localhost:3000` (admin-api)
- Endpoints used:
  - POST `/auth/login` - Login
  - POST `/auth/register` - Signup
  - GET `/rides` - Get user rides
  - POST `/rides` - Create new ride
  - GET `/rides/:id` - Get ride details
  - WebSocket for real-time updates

### Constants
```typescript
// src/constants/colors.ts
export const Colors = {
  primary: '#4CAF50',      // Green
  secondary: '#2196F3',    // Blue
  background: '#FFFFFF',
  backgroundMuted: '#F5F5F5',
  text: '#212121',
  textLight: '#757575',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
};
```

### Dependencies (key ones)
- expo: ~54.0.0
- react-native: 0.82.1
- react-native-maps: 1.26.19
- @react-navigation/native: ^7.x
- @react-navigation/stack: ^7.x
- @react-navigation/bottom-tabs: ^7.x
- react-native-screens: 4.18.0
- react-native-safe-area-context: 5.4.0
- socket.io-client: for real-time updates

---

## 2. Driver App (`apps/driver-app`)

### Purpose
Driver-facing mobile app for accepting and completing rides.

### Key Features Implemented
1. **Authentication** - Driver login
2. **Home Screen** - Map showing current location, online/offline toggle
3. **Ride Requests** - Incoming ride request notifications
4. **Active Ride** - Navigation to pickup, then to destination
5. **Earnings** - Daily/weekly earnings summary
6. **Profile** - Driver profile and vehicle info

### Screen Structure
```
src/screens/
├── LoginScreen.tsx         - Driver login
├── HomeScreen.tsx          - Main map + status toggle
├── RideRequestScreen.tsx   - Incoming ride details
├── ActiveRideScreen.tsx    - Current ride navigation
├── EarningsScreen.tsx      - Earnings dashboard
└── ProfileScreen.tsx       - Driver settings
```

### Navigation Structure
- Stack Navigator for auth flow
- Tab Navigator for main app (Home, Earnings, Profile)
- Modal for ride request acceptance

### Key Components
```
src/components/
├── CrossPlatformMap.tsx      - Native map (react-native-maps with PROVIDER_GOOGLE)
├── CrossPlatformMap.web.tsx  - Web placeholder map
├── StatusToggle.tsx          - Online/Offline switch
├── RideRequestCard.tsx       - Incoming ride popup
└── NavigationView.tsx        - Turn-by-turn directions
```

### API Integration
- Backend URL: `http://localhost:3000` (admin-api)
- Endpoints used:
  - POST `/auth/driver/login` - Driver login
  - GET `/drivers/me` - Get driver profile
  - PATCH `/drivers/me/status` - Update online status
  - PATCH `/drivers/me/location` - Update GPS location
  - GET `/rides/pending` - Get available rides
  - PATCH `/rides/:id/accept` - Accept ride
  - PATCH `/rides/:id/pickup` - Mark picked up
  - PATCH `/rides/:id/complete` - Complete ride
  - WebSocket for real-time ride requests

### Constants
```typescript
// src/constants/colors.ts
export const Colors = {
  primary: '#FF9800',      // Orange (driver theme)
  secondary: '#4CAF50',    // Green
  background: '#FFFFFF',
  backgroundMuted: '#F5F5F5',
  text: '#212121',
  textLight: '#757575',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  online: '#4CAF50',
  offline: '#9E9E9E',
};
```

### Dependencies (key ones)
- Same as rider-app plus:
- react-native-maps with Google provider
- Background location tracking capability needed

---

## 3. Shared Backend API (admin-api)

### Relevant Endpoints for Mobile Apps

#### Authentication
```
POST /auth/register          - Register new rider
POST /auth/login             - Login (rider/driver)
POST /auth/refresh           - Refresh JWT token
```

#### Rides
```
GET    /rides                - List rides (filtered by user)
POST   /rides                - Create new ride request
GET    /rides/:id            - Get ride details
PATCH  /rides/:id/accept     - Driver accepts ride
PATCH  /rides/:id/pickup     - Driver picked up rider
PATCH  /rides/:id/complete   - Complete ride
PATCH  /rides/:id/cancel     - Cancel ride
```

#### Drivers
```
GET    /drivers/me           - Get driver profile
PATCH  /drivers/me/status    - Update online/offline
PATCH  /drivers/me/location  - Update GPS coordinates
```

#### Fare Calculation
```
POST   /fares/estimate       - Get fare estimate
  Body: { pickupLat, pickupLng, destLat, destLng }
```

### WebSocket Events
```
// Rider events
'ride:status'      - Ride status changed
'driver:location'  - Driver location update during ride

// Driver events
'ride:new'         - New ride request available
'ride:cancelled'   - Rider cancelled
```

---

## 4. Database Schema (Relevant Tables)

### Users
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  phone     String?
  name      String
  role      Role     @default(RIDER)
  rides     Ride[]   @relation("RiderRides")
}
```

### Drivers
```prisma
model Driver {
  id           String   @id @default(uuid())
  userId       String   @unique
  user         User     @relation(fields: [userId])
  vehicleType  String
  licensePlate String
  isOnline     Boolean  @default(false)
  currentLat   Float?
  currentLng   Float?
  rides        Ride[]   @relation("DriverRides")
}
```

### Rides
```prisma
model Ride {
  id            String     @id @default(uuid())
  riderId       String
  rider         User       @relation("RiderRides", fields: [riderId])
  driverId      String?
  driver        Driver?    @relation("DriverRides", fields: [driverId])
  status        RideStatus @default(PENDING)
  pickupLat     Float
  pickupLng     Float
  pickupAddress String
  destLat       Float
  destLng       Float
  destAddress   String
  fare          Float?
  createdAt     DateTime   @default(now())
  completedAt   DateTime?
}

enum RideStatus {
  PENDING
  ACCEPTED
  ARRIVED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

---

## 5. Configuration Files Needed

### app.json (for both apps)
```json
{
  "expo": {
    "name": "App Name",
    "slug": "app-slug",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.taxi.appname",
      "config": {
        "googleMapsApiKey": "YOUR_IOS_KEY"
      },
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "We need your location to show nearby drivers",
        "NSLocationAlwaysUsageDescription": "We need your location to track rides"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.taxi.appname",
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_KEY"
        }
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location."
        }
      ]
    ]
  }
}
```

---

## 6. Issues Encountered (Why Rebuilding)

1. **Metro bundler SHA-1 error** - Stray node_modules at `/Users/quniber/node_modules/` causing resolution conflicts
2. **react-native-maps web compatibility** - Native-only module breaks web builds
3. **Monorepo complexity** - Module resolution issues between apps and shared packages
4. **Version mismatches** - React, React Native, and Expo SDK version conflicts

---

## 7. Rebuild Recommendations

### Use Expo SDK 54+ with:
- `expo-location` instead of react-native-geolocation
- `expo-maps` or `react-native-maps` with proper platform handling
- `expo-router` for file-based routing (simpler than React Navigation)
- Proper monorepo setup with workspaces

### Project Structure
```
apps/
├── rider-app/
│   ├── app/              # Expo Router pages
│   ├── components/       # Shared components
│   ├── constants/        # Colors, config
│   ├── hooks/           # Custom hooks
│   ├── services/        # API calls
│   └── assets/          # Images, fonts
├── driver-app/
│   └── (same structure)
└── packages/
    └── shared/          # Shared types, utils
```

### Key Expo Packages to Use
```
expo-location          - GPS location
expo-router           - Navigation
expo-secure-store     - Token storage
expo-notifications    - Push notifications (for ride requests)
expo-task-manager     - Background location (driver app)
```

---

## 8. Environment Variables Needed

```
# .env
API_URL=http://localhost:3000
GOOGLE_MAPS_API_KEY=your_key_here
WS_URL=ws://localhost:3000
```

---

## 9. Current File Locations to Reference

### Rider App
- Screens: `apps/rider-app/src/screens/`
- Components: `apps/rider-app/src/components/`
- Navigation: `apps/rider-app/src/navigation/`
- Services: `apps/rider-app/src/services/`

### Driver App
- Screens: `apps/driver-app/src/screens/`
- Components: `apps/driver-app/src/components/`
- Navigation: `apps/driver-app/src/navigation/`
- Services: `apps/driver-app/src/services/`

---

This documentation should provide everything needed to rebuild the apps from scratch.
