# Rider API Fixes Documentation

This document contains all the fixes made to the rider-api to match the Prisma schema correctly.

---

## Summary of Fixed Files

1. `apps/rider-api/src/addresses/addresses.service.ts`
2. `apps/rider-api/src/auth/auth.service.ts`
3. `apps/rider-api/src/auth/jwt.strategy.ts`
4. `apps/rider-api/src/coupons/coupons.service.ts`
5. `apps/rider-api/src/orders/orders.service.ts`
6. `apps/rider-api/src/payment-methods/payment-methods.service.ts`
7. `apps/rider-api/src/payment-methods/payment-methods.controller.ts`

---

## Schema Reference (Correct Field Names)

### Customer Model
```
id                      Int
firstName               String?
lastName                String?
mobileNumber            String        (unique)
email                   String?       (unique)
password                String?
gender                  Gender?       (enum: male, female, other)
status                  CustomerStatus (enum: enabled, disabled, blocked) - NOT isActive!
countryIso              String?
isResident              Boolean?
idNumber                String?
mediaId                 Int?
presetAvatarNumber      Int?
walletBalance           Decimal
defaultPaymentMethodId  Int?
notificationToken       String?
lastActivityAt          DateTime?
deletedAt               DateTime?
createdAt               DateTime
```

### Coupon Model
```
id                  Int
code                String      (unique)
title               String
description         String?
discountPercent     Int         (NOT percent!)
discountFlat        Decimal     (check Number(discountFlat) > 0 for flat discount)
minimumCost         Decimal     (NOT minimumOrderAmount!)
maximumCost         Decimal     (NOT maximumDiscount!)
manyUsersCanUse     Int         (NOT usageLimit! - 0 means unlimited)
manyTimesUserCanUse Int         (NOT perUserLimit! - 0 means unlimited)
isEnabled           Boolean
startAt             DateTime
expireAt            DateTime?
createdAt           DateTime
```

### Order Model
```
id                    Int
customerId            Int
driverId              Int?
serviceId             Int
couponId              Int?
paymentGatewayId      Int?
savedPaymentMethodId  Int?
status                OrderStatus     (enum - see below)
paymentMode           PaymentMode     (enum: cash, wallet, saved_payment_method, payment_gateway)
currency              String
costBest              Decimal
costAfterCoupon       Decimal?
paidAmount            Decimal
tipAmount             Decimal
pickupAddress         String
pickupLatitude        Float
pickupLongitude       Float
dropoffAddress        String
dropoffLatitude       Float
dropoffLongitude      Float
distanceMeters        Int?
durationMinutes       Int?
riderNote             String?
adminNote             String?
waitMinutes           Int
expectedPickupAt      DateTime?
startedAt             DateTime?
arrivedAt             DateTime?
finishedAt            DateTime?
createdAt             DateTime
```

### OrderStatus Enum
```
Requested
Found
NotFound
NoCloseFound
Booked
Arrived
Started
WaitingForReview
WaitingForPostPay
Finished
DriverCanceled
RiderCanceled
Expired
```

### PaymentMode Enum
```
cash
wallet
saved_payment_method
payment_gateway
```

### Driver Model (No location fields!)
```
id                  Int
firstName           String
lastName            String
mobileNumber        String
email               String?
status              DriverStatus
carPlate            String?
carColor            String?
carModel            String?
rating              Decimal?
reviewCount         Int
... (NO locationLat, locationLng, lastLocationAt!)
```

### RiderReview Model
```
id          Int
orderId     Int
customerId  Int
score       Int       (NOT rating!)
comment     String?
createdAt   DateTime
```

### OrderMessage Model
```
id          Int
orderId     Int
content     String
sentByDriver Boolean  (NOT senderType! - false = sent by rider)
createdAt   DateTime
```

### OrderCancelReason Model
```
id          Int
title       String
isForDriver Boolean   (NOT userType!)
isForRider  Boolean   (NOT userType!)
isEnabled   Boolean
```

### SavedPaymentMethod Model
```
id               Int
customerId       Int?
driverId         Int?
paymentGatewayId Int
title            String
lastFour         String?
providerBrand    String?   (NOT type!)
token            String    (NOT providerToken!)
isDefault        Boolean
createdAt        DateTime
```

### PaymentGateway Model
```
id          Int
type        PaymentGatewayType
title       String
description String?
publicKey   String?
privateKey  String
merchantId  String?
saltKey     String?
mediaId     Int?
media       Media?    (relation)
isEnabled   Boolean
createdAt   DateTime
... (NO sortOrder!)
```

### CustomerAddress Model
```
id          Int
customerId  Int
title       String
address     String
latitude    Float
longitude   Float
type        AddressType   (enum: home, work, other)
isDefault   Boolean
createdAt   DateTime
```

### Gender Enum
```
male
female
other
```

---

## Fix Details

### 1. addresses.service.ts
**Issue:** String type to AddressType enum conversion

**Fix:**
```typescript
import { AddressType } from 'database';

// Convert string to enum:
let addressType: AddressType = AddressType.other;
if (data.type === 'home') addressType = AddressType.home;
else if (data.type === 'work') addressType = AddressType.work;
```

### 2. auth.service.ts
**Issue:** Gender string to Gender enum conversion

**Fix:**
```typescript
import { Gender } from 'database';

// In updateProfile method:
if (data.gender !== undefined) {
  if (data.gender === 'male') updateData.gender = Gender.male;
  else if (data.gender === 'female') updateData.gender = Gender.female;
  else updateData.gender = Gender.other;
}
```

### 3. jwt.strategy.ts
**Issue:** Using `isActive` instead of `status`

**Wrong:**
```typescript
if (!customer || !customer.isActive) {
  throw new UnauthorizedException();
}
```

**Correct:**
```typescript
if (!customer || customer.status !== 'enabled') {
  throw new UnauthorizedException();
}
```

### 4. coupons.service.ts
**Issues:**
- `usageLimit` → `manyUsersCanUse`
- `perUserLimit` → `manyTimesUserCanUse`
- `maximumDiscount` → `maximumCost`
- `minimumOrderAmount` → `minimumCost`
- `isFlat` field doesn't exist

**Correct Logic:**
```typescript
// Check if flat discount:
const isFlat = Number(coupon.discountFlat) > 0;

// Calculate discount:
if (isFlat) {
  discount = Number(coupon.discountFlat);
} else {
  discount = (orderAmount * coupon.discountPercent) / 100;
  const maxDiscount = Number(coupon.maximumCost);
  if (maxDiscount > 0 && discount > maxDiscount) {
    discount = maxDiscount;
  }
}

// Check usage limits (0 means unlimited):
if (coupon.manyUsersCanUse > 0) {
  const totalUsage = await this.prisma.order.count({
    where: {
      couponId: coupon.id,
      status: { notIn: ['RiderCanceled', 'DriverCanceled'] },
    },
  });
  if (totalUsage >= coupon.manyUsersCanUse) {
    // Coupon usage exceeded
  }
}

if (coupon.manyTimesUserCanUse > 0) {
  const usageCount = await this.prisma.order.count({
    where: {
      customerId,
      couponId: coupon.id,
      status: { notIn: ['RiderCanceled', 'DriverCanceled'] },
    },
  });
  if (usageCount >= coupon.manyTimesUserCanUse) {
    // User has used this coupon max times
  }
}
```

### 5. orders.service.ts
**Issues:**
- PaymentMode string to enum
- Driver location fields don't exist
- RiderReview uses `score` not `rating`
- OrderMessage uses `sentByDriver` not `senderType`
- OrderCancelReason uses `isForRider` not `userType`

**Fixes:**

```typescript
import { OrderStatus, PaymentMode } from 'database';

// PaymentMode conversion:
let paymentModeEnum: PaymentMode = PaymentMode.cash;
if (data.paymentMode === 'wallet') paymentModeEnum = PaymentMode.wallet;
else if (data.paymentMode === 'saved_payment_method') paymentModeEnum = PaymentMode.saved_payment_method;
else if (data.paymentMode === 'payment_gateway') paymentModeEnum = PaymentMode.payment_gateway;

// Create order with enum:
const order = await this.prisma.order.create({
  data: {
    // ...
    paymentMode: paymentModeEnum,
  },
});

// Driver info (NO location fields):
driver: order.driver ? {
  id: order.driver.id,
  firstName: order.driver.firstName,
  lastName: order.driver.lastName,
  mobileNumber: order.driver.mobileNumber,
  carPlate: order.driver.carPlate,
  carColor: order.driver.carColor,
  carModel: order.driver.carModel,
  rating: order.driver.rating,
  // NO locationLat, locationLng, lastLocationAt
} : null,

// Create review with score:
await this.prisma.riderReview.create({
  data: {
    orderId,
    customerId,
    score: data.rating,  // API accepts 'rating', stored as 'score'
    comment: data.comment,
  },
});

// Create message with sentByDriver:
await this.prisma.orderMessage.create({
  data: {
    orderId,
    content: message,
    sentByDriver: false,  // false = sent by rider
  },
});

// Get cancel reasons for rider:
const reasons = await this.prisma.orderCancelReason.findMany({
  where: {
    isEnabled: true,
    isForRider: true,  // NOT userType: { in: ['rider', 'both'] }
  },
});

// OrderStatus type casting:
const activeStatuses: OrderStatus[] = [
  'Requested' as OrderStatus,
  'Found' as OrderStatus,
  'Booked' as OrderStatus,
  'Arrived' as OrderStatus,
  'Started' as OrderStatus,
];
```

### 6. payment-methods.service.ts
**Issues:**
- SavedPaymentMethod has no `type`, `expiryDate`, `holderName`
- Use `token` not `providerToken`
- PaymentGateway has no `sortOrder`

**Correct Structure:**
```typescript
// Get payment methods:
const methods = await this.prisma.savedPaymentMethod.findMany({
  where: { customerId },
  include: { paymentGateway: true },
  orderBy: { createdAt: 'desc' },
});

return methods.map((m) => ({
  id: m.id,
  title: m.title,
  lastFour: m.lastFour,
  providerBrand: m.providerBrand,
  paymentGatewayType: m.paymentGateway.type,
  isDefault: m.id === customer?.defaultPaymentMethodId,
  createdAt: m.createdAt,
}));

// Add payment method:
const method = await this.prisma.savedPaymentMethod.create({
  data: {
    customerId,
    paymentGatewayId: data.paymentGatewayId,
    title: data.title,
    token: data.token,  // NOT providerToken!
    lastFour: data.lastFour,
    providerBrand: data.providerBrand,
  },
});

// Get payment gateways (NO sortOrder!):
const gateways = await this.prisma.paymentGateway.findMany({
  where: { isEnabled: true },
  orderBy: { id: 'asc' },  // NOT sortOrder!
  include: { media: true },
});
```

### 7. payment-methods.controller.ts
**Issue:** Controller body type didn't match updated service

**Wrong:**
```typescript
@Body()
body: {
  type: string;
  title: string;
  token?: string;
  lastFour?: string;
  expiryDate?: string;
  holderName?: string;
},
```

**Correct:**
```typescript
@Body()
body: {
  paymentGatewayId: number;
  title: string;
  token: string;
  lastFour?: string;
  providerBrand?: string;
},
```

---

## Import Reference

```typescript
// Common imports from database package:
import {
  OrderStatus,
  PaymentMode,
  Gender,
  AddressType,
  CustomerStatus,
  DriverStatus,
  PaymentGatewayType
} from 'database';
```

---

## Quick Checklist

When working with rider-api, always verify:

- [ ] Customer status check uses `status !== 'enabled'` not `isActive`
- [ ] Gender uses `Gender` enum not string
- [ ] AddressType uses `AddressType` enum not string
- [ ] PaymentMode uses `PaymentMode` enum not string
- [ ] Coupon fields: `manyUsersCanUse`, `manyTimesUserCanUse`, `minimumCost`, `maximumCost`
- [ ] Check flat discount with `Number(coupon.discountFlat) > 0`
- [ ] RiderReview uses `score` not `rating`
- [ ] OrderMessage uses `sentByDriver: boolean` not `senderType: string`
- [ ] OrderCancelReason uses `isForRider: boolean` not `userType`
- [ ] SavedPaymentMethod uses `token` not `providerToken`
- [ ] SavedPaymentMethod has no `type`, `expiryDate`, `holderName`
- [ ] PaymentGateway has no `sortOrder`
- [ ] Driver has no `locationLat`, `locationLng`, `lastLocationAt`
