# Admin API Testing Log

## Test Date: 2025-11-28

---

## Step 1: Start the API Server

```bash
npm run admin-api
```

**Result:** Server started successfully on http://localhost:3000

---

## Step 2: Login to get JWT Token

**Request:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@taxi.com",
  "password": "Admin123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "operator": {
    "id": 1,
    "email": "admin@taxi.com",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "admin"
  }
}
```

**Status:** SUCCESS

---

## Step 3: Create a Service

**Request:**
```bash
POST /api/services
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Standard Taxi Test",
  "baseFare": 5.00,
  "perHundredMeters": 0.50,
  "perMinuteDrive": 0.30,
  "minimumFare": 10.00,
  "personCapacity": 4
}
```

**Response:**
```json
{
  "id": 4,
  "categoryId": null,
  "name": "Standard Taxi Test",
  "description": null,
  "mediaId": null,
  "personCapacity": 4,
  "baseFare": "5",
  "perHundredMeters": "0.5",
  "perMinuteDrive": "0.3",
  "perMinuteWait": "0",
  "minimumFare": "10",
  "cancellationFee": "0",
  "cancellationDriverShare": "0",
  "providerSharePercent": 0,
  "providerShareFlat": "0",
  "searchRadius": 10000,
  "prepayPercent": 0,
  "twoWayAvailable": false,
  "availableTimeFrom": "00:00",
  "availableTimeTo": "23:59",
  "displayPriority": 0,
  "isActive": true,
  "createdAt": "2025-11-28T07:55:20.795Z",
  "updatedAt": "2025-11-28T07:55:20.795Z",
  "deletedAt": null,
  "category": null
}
```

**Service ID:** 4
**Status:** SUCCESS

---

## Step 4: Create a Customer

**Request:**
```bash
POST /api/customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "mobileNumber": "+1234567892"
}
```

**Response:**
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "email": null,
  "mobileNumber": "+1234567892",
  "countryIso": null,
  "gender": null,
  "password": null,
  "status": "enabled",
  "isResident": null,
  "idNumber": null,
  "notificationToken": null,
  "mediaId": null,
  "presetAvatarNumber": null,
  "walletBalance": "0",
  "defaultPaymentMethodId": null,
  "lastActivityAt": null,
  "createdAt": "2025-11-28T07:55:20.837Z",
  "updatedAt": "2025-11-28T07:55:20.837Z",
  "deletedAt": null,
  "media": null
}
```

**Customer ID:** 1
**Status:** SUCCESS

---

## Step 5: Create an Order

**Request:**
```bash
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": 1,
  "serviceId": 4,
  "pickupAddress": "123 Main Street",
  "pickupLatitude": 40.7128,
  "pickupLongitude": -74.006,
  "dropoffAddress": "456 Oak Avenue",
  "dropoffLatitude": 40.758,
  "dropoffLongitude": -73.9855
}
```

**Response:**
```json
{
  "id": 1,
  "status": "Requested",
  "customerId": 1,
  "driverId": null,
  "serviceId": 4,
  "regionId": null,
  "fleetId": null,
  "couponId": null,
  "addresses": "[{\"type\":\"pickup\",\"address\":\"123 Main Street\",\"latitude\":40.7128,\"longitude\":-74.006},{\"type\":\"dropoff\",\"address\":\"456 Oak Avenue\",\"latitude\":40.758,\"longitude\":-73.9855}]",
  "points": "[]",
  "pickupAddress": "123 Main Street",
  "pickupLatitude": "40.7128",
  "pickupLongitude": "-74.006",
  "dropoffAddress": "456 Oak Avenue",
  "dropoffLatitude": "40.758",
  "dropoffLongitude": "-73.9855",
  "distanceMeters": 0,
  "durationSeconds": 0,
  "waitMinutes": 0,
  "expectedTimestamp": "2025-11-28T07:55:20.881Z",
  "currency": "USD",
  "serviceCost": "15",
  "waitCost": "0",
  "optionsCost": "0",
  "taxCost": "0",
  "costBest": "0",
  "costAfterCoupon": "0",
  "tipAmount": "0",
  "paidAmount": "0",
  "providerShare": "0",
  "paymentMode": "cash",
  "createdAt": "2025-11-28T07:55:20.882Z",
  "updatedAt": "2025-11-28T07:55:20.882Z",
  "customer": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "mobileNumber": "+1234567892"
  },
  "driver": null,
  "service": {
    "id": 4,
    "name": "Standard Taxi Test",
    "baseFare": "5",
    "minimumFare": "10"
  }
}
```

**Order ID:** 1
**Status:** SUCCESS

---

## Step 6: Get Order Details

**Request:**
```bash
GET /api/orders/1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "status": "Requested",
  "customerId": 1,
  "driverId": null,
  "serviceId": 4,
  "regionId": null,
  "fleetId": null,
  "couponId": null,
  "addresses": "[{\"type\":\"pickup\",\"address\":\"123 Main Street\",\"latitude\":40.7128,\"longitude\":-74.006},{\"type\":\"dropoff\",\"address\":\"456 Oak Avenue\",\"latitude\":40.758,\"longitude\":-73.9855}]",
  "points": "[]",
  "pickupAddress": "123 Main Street",
  "pickupLatitude": "40.7128",
  "pickupLongitude": "-74.006",
  "dropoffAddress": "456 Oak Avenue",
  "dropoffLatitude": "40.758",
  "dropoffLongitude": "-73.9855",
  "distanceMeters": 0,
  "durationSeconds": 0,
  "waitMinutes": 0,
  "expectedTimestamp": "2025-11-28T07:55:20.881Z",
  "pickupEta": null,
  "dropOffEta": null,
  "currency": "USD",
  "serviceCost": "15",
  "waitCost": "0",
  "optionsCost": "0",
  "taxCost": "0",
  "costBest": "0",
  "costAfterCoupon": "0",
  "tipAmount": "0",
  "paidAmount": "0",
  "providerShare": "0",
  "paymentMode": "cash",
  "paymentGatewayId": null,
  "savedPaymentMethodId": null,
  "cancelReasonId": null,
  "cancelReasonNote": null,
  "acceptedAt": null,
  "arrivedAt": null,
  "startedAt": null,
  "finishedAt": null,
  "canceledAt": null,
  "createdAt": "2025-11-28T07:55:20.882Z",
  "updatedAt": "2025-11-28T07:55:20.882Z",
  "customer": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": null,
    "mobileNumber": "+1234567892",
    "status": "enabled",
    "walletBalance": "0"
  },
  "driver": null,
  "service": {
    "id": 4,
    "name": "Standard Taxi Test",
    "personCapacity": 4,
    "baseFare": "5",
    "perHundredMeters": "0.5",
    "perMinuteDrive": "0.3",
    "minimumFare": "10",
    "isActive": true
  },
  "region": null,
  "fleet": null,
  "coupon": null,
  "cancelReason": null,
  "options": [],
  "feedback": null,
  "riderReview": null
}
```

**Status:** SUCCESS

---

## Test Results Summary

| Step | Status | Notes |
|------|--------|-------|
| Login | SUCCESS | Token obtained, admin user authenticated |
| Create Service | SUCCESS | Service ID: 4, serviceCost calculated as baseFare + minimumFare = $15 |
| Create Customer | SUCCESS | Customer ID: 1 |
| Create Order | SUCCESS | Order ID: 1, status: "Requested" |
| Get Order | SUCCESS | Full order details retrieved with customer, service relations |

---

## Notes

- API running on: http://localhost:3000/api
- All endpoints require JWT authentication (except login/register)
- Order creation automatically:
  - Calculates serviceCost from service baseFare + minimumFare
  - Creates addresses JSON for multi-waypoint support
  - Creates initial OrderActivity log entry
  - Sets status to "Requested" (or "DriverAccepted" if driverId provided)
- Authentication returns `accessToken` (camelCase) in response

## Key Observations

1. **Service Cost Calculation**: The order's `serviceCost` is calculated as `baseFare ($5) + minimumFare ($10) = $15`
2. **Address Format**: Both legacy fields (`pickupAddress`, `dropoffAddress`) and new JSON `addresses` field are populated
3. **Order Status Flow**: New orders start with status "Requested"
4. **Relations**: Order details include full customer, service, and other related entity data
