# Admin Panel - Errors & Fixes Log

## Resolved Issues

### 1. SocketModule JwtService Dependency Injection Error

**Error:**
```
Nest can't resolve dependencies of the SocketGateway (?, ConfigService).
Please make sure that the argument JwtService at index [0] is available in the SocketModule context.
```

**Cause:** The `SocketGateway` required `JwtService` but it wasn't imported in the `SocketModule`.

**Fix:** Added `JwtModule.registerAsync()` to `apps/admin-api/src/socket/socket.module.ts`:
```typescript
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  // ...
})
```

---

### 2. localStorage JSON Parse 'undefined' Error

**Error:**
```
undefined is not valid JSON (at auth-context.tsx:26)
```

**Cause:** When localStorage contained the literal string `"undefined"` instead of valid JSON, `JSON.parse()` threw an error.

**Fix:** Updated `apps/admin-panel/src/contexts/auth-context.tsx`:
```typescript
useEffect(() => {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (token && storedUser && storedUser !== 'undefined') {
    try {
      api.setToken(token);
      setUser(JSON.parse(storedUser));
    } catch {
      // Invalid stored user data, clear it
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  setIsLoading(false);
}, []);
```

---

### 3. API Login Response Format Mismatch

**Error:** Login API call succeeded but user wasn't authenticated in the frontend.

**Cause:** Backend returns `{ accessToken, operator }` but frontend expected `{ access_token, user }`.

**Fix:** Updated `apps/admin-panel/src/lib/api.ts` login method to map the response:
```typescript
async login(email: string, password: string) {
  const response = await this.client.post<{ accessToken: string; operator: Admin }>('/auth/login', {
    email,
    password,
  });
  this.token = response.data.accessToken;
  return {
    access_token: response.data.accessToken,
    user: response.data.operator,
  };
}
```

---

### 4. Missing Dashboard Endpoints (404 Error)

**Error:**
```
GET http://localhost:3000/api/dashboard/recent-orders?limit=5 404 (Not Found)
GET http://localhost:3000/api/dashboard/orders-by-status 404 (Not Found)
GET http://localhost:3000/api/dashboard/revenue-by-date 404 (Not Found)
```

**Cause:** The frontend dashboard page called endpoints that didn't exist in the backend.

**Fix:** Added 3 new endpoints to `apps/admin-api/src/dashboard/dashboard.controller.ts`:
```typescript
@Get('recent-orders')
getRecentOrders(@Query('limit') limit = '10') {
  return this.dashboardService.getRecentOrders(+limit);
}

@Get('orders-by-status')
getOrdersByStatus() {
  return this.dashboardService.getOrdersByStatus();
}

@Get('revenue-by-date')
getRevenueByDate(
  @Query('startDate') startDate: string,
  @Query('endDate') endDate: string,
) {
  return this.dashboardService.getRevenueByDate(startDate, endDate);
}
```

And corresponding service methods in `apps/admin-api/src/dashboard/dashboard.service.ts`:
- `getRecentOrders(limit)` - Returns recent orders with customer/driver/service info
- `getOrdersByStatus()` - Returns order counts grouped by status
- `getRevenueByDate(startDate, endDate)` - Returns revenue data grouped by date

---

### 5. Dashboard Stats Response Format Mismatch

**Error:** Dashboard stats cards showed 0 values even though API returned data.

**Cause:** Backend returned nested structure:
```typescript
{ customers: { total: 10 }, drivers: { total: 5 }, ... }
```
But frontend expected flat structure:
```typescript
{ totalCustomers: 10, totalDrivers: 5, ... }
```

**Fix:** Updated `apps/admin-api/src/dashboard/dashboard.service.ts` to include flat properties:
```typescript
return {
  // Flat properties for frontend compatibility
  totalCustomers,
  totalDrivers,
  activeDrivers: onlineDrivers,
  totalOrders,
  pendingOrders,
  totalRevenue: Number(totalRevenueResult._sum?.paidAmount || 0),
  // Nested data kept for backward compatibility
  customers: { total: totalCustomers, active: activeCustomers },
  drivers: { total: totalDrivers, approved: approvedDrivers, online: onlineDrivers },
  orders: { total: totalOrders, completed: completedOrders, cancelled: cancelledOrders, today: todayOrders },
  revenue: { total: totalRevenue, today: todayRevenue },
};
```

---

## Login Credentials

- **Email:** `admin@taxi.com`
- **Password:** `Admin123!`

## Running the Application

```bash
# Start admin API (port 3000)
npm run admin-api

# Start admin panel (port 3001)
cd apps/admin-panel && npm run dev
```

Access the admin panel at: http://localhost:3001

---

### 6. Missing Coupons Endpoint (404 Error)

**Error:**
```
GET http://localhost:3000/api/coupons 404 (Not Found)
```

**Cause:** The coupons module didn't exist in the admin API.

**Fix:** Created `apps/admin-api/src/coupons/` module with:
- `coupons.controller.ts` - CRUD endpoints for coupons
- `coupons.service.ts` - Business logic using Prisma
- `coupons.module.ts` - Module registration

---

### 7. Missing Complaints/Support Endpoint (404 Error)

**Error:**
```
GET http://localhost:3000/api/complaints 404 (Not Found)
```

**Cause:** The complaints/support module didn't exist in the admin API.

**Fix:** Created `apps/admin-api/src/complaints/` module with:
- `complaints.controller.ts` - CRUD endpoints for support requests
- `complaints.service.ts` - Business logic using Prisma
- `complaints.module.ts` - Module registration

---

### 8. Missing Payments Endpoints (404 Error)

**Error:**
```
GET http://localhost:3000/api/payments/customer-transactions 404 (Not Found)
GET http://localhost:3000/api/payments/stats 404 (Not Found)
```

**Cause:** The payment controller had wrong path prefix (`payment` instead of `payments`).

**Fix:** Updated `apps/admin-api/src/payment/payment.controller.ts`:
```typescript
@Controller('payments')  // Changed from 'payment'
```

---

### 9. Driver Creation 500 Error

**Error:**
```
POST http://localhost:3000/api/drivers 500 (Internal Server Error)
```

**Cause:** Backend required `password` and `email` as mandatory fields, but admin panel didn't send them.

**Fix:**
1. Made `password` and `email` optional in `apps/admin-api/src/drivers/drivers.service.ts`
2. Auto-generate random password if not provided
3. Changed frontend form field from `vehiclePlate` to `carPlate`

---

### 10. Driver Rating TypeError

**Error:**
```
TypeError: (driver.rating || 0).toFixed is not a function
```

**Cause:** Prisma returns `Decimal` type which doesn't have `toFixed` method directly.

**Fix:** Updated `apps/admin-panel/src/app/(dashboard)/drivers/page.tsx`:
```typescript
{Number(driver.rating || 0).toFixed(1)}
```

---

### 11. API Response Format Mismatch (Customers/Drivers)

**Error:** Frontend showed empty lists even though API returned data.

**Cause:** Backend returned `{ drivers: [], total, page, limit }` but frontend expected `{ data: [], meta: {} }`.

**Fix:** Updated `apps/admin-panel/src/lib/api.ts` to transform responses:
```typescript
async getDrivers(params?) {
  const response = await this.client.get<{ drivers: Driver[]; total: number; page: number; limit: number }>('/drivers', { params });
  return {
    data: response.data.drivers,
    meta: {
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
      totalPages: Math.ceil(response.data.total / response.data.limit),
    },
  };
}
```

---

### 12. Dropdown Menus Cut Off in Tables

**Error:** When clicking three-dot menu in tables, dropdown was hidden by table overflow.

**Cause:** Parent containers had `overflow-x-auto` which clipped absolutely positioned dropdowns.

**Fix:** Changed dropdowns to use fixed positioning in:
- `apps/admin-panel/src/app/(dashboard)/drivers/page.tsx`
- `apps/admin-panel/src/app/(dashboard)/customers/page.tsx`
- `apps/admin-panel/src/app/(dashboard)/services/page.tsx`

```typescript
const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  setMenuPosition({
    top: rect.bottom + 4,
    left: rect.right - 144,
  });
  setShowMenu(!showMenu);
};
// Used style={{ top: menuPosition.top, left: menuPosition.left }} with position: fixed
```

---

### 13. Delete Without Confirmation

**Error:** Clicking delete immediately removed items without confirmation.

**Fix:**
1. Created `apps/admin-panel/src/components/confirm-dialog.tsx` component
2. Integrated confirmation dialog in drivers, customers, and services pages
3. Shows "Are you sure you want to delete [name]?" before deletion

---

### 14. Customer Edit Button Not Working

**Error:** Clicking Edit in customer dropdown did nothing.

**Fix:** Added edit functionality to `apps/admin-panel/src/app/(dashboard)/customers/page.tsx`:
- Added edit modal with pre-filled form data
- Added `updateMutation` using `api.updateCustomer()`
- Added `handleEditClick` to populate form and open modal
- Connected Edit button to `onEdit` handler

---

## New Features Added

### Driver Approvals Page
Created `apps/admin-panel/src/app/(dashboard)/drivers/approvals/page.tsx`:
- View pending driver applications
- Review uploaded documents
- Approve or reject drivers with notes
- Filter by status (pending_approval, soft_reject, etc.)

### Modal Component
Created `apps/admin-panel/src/components/modal.tsx`:
- Reusable modal component for forms
- Used across customers, drivers, services pages

### Confirm Dialog Component
Created `apps/admin-panel/src/components/confirm-dialog.tsx`:
- Reusable confirmation dialog
- Supports danger, warning, default variants
- Loading state support

---

### 15. Profile API Endpoints Missing (404 Error)

**Error:**
```
PATCH http://localhost:3000/api/auth/profile 404 (Not Found)
POST http://localhost:3000/api/auth/change-password 404 (Not Found)
```

**Cause:** Profile update and password change endpoints didn't exist in the auth controller.

**Fix:** Added to `apps/admin-api/src/auth/auth.controller.ts`:
```typescript
@UseGuards(JwtAuthGuard)
@Patch('profile')
updateProfile(
  @Request() req: { user: { id: number } },
  @Body() body: { firstName?: string; lastName?: string; email?: string },
) {
  return this.authService.updateProfile(req.user.id, body);
}

@UseGuards(JwtAuthGuard)
@Post('change-password')
changePassword(
  @Request() req: { user: { id: number } },
  @Body() body: { currentPassword: string; newPassword: string },
) {
  return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
}
```

And corresponding service methods in `apps/admin-api/src/auth/auth.service.ts`.

---

### 16. Customer Creation 500 Error (Unique Constraint)

**Error:**
```
POST http://localhost:3000/api/customers 500 (Internal Server Error)
```

**Cause:** Empty string emails (`""`) violated unique constraint when creating multiple customers without emails.

**Fix:** Updated `apps/admin-api/src/customers/customers.service.ts`:
```typescript
async create(data) {
  try {
    return await this.prisma.customer.create({
      data: {
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        email: data.email || null, // Convert empty string to null
        mobileNumber: data.mobileNumber,
        countryIso: data.countryIso || null,
        gender: data.gender || null,
      },
      include: { media: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Handle unique constraint violations with friendly messages
      }
    }
    throw error;
  }
}
```

---

## New Features Added (Phase 8)

### Dark Mode Toggle
- Created `apps/admin-panel/src/contexts/theme-context.tsx`
- Supports light/dark/system modes with localStorage persistence
- Toggle button in sidebar cycles through modes

### Settings Page
- Created `apps/admin-panel/src/app/(dashboard)/settings/page.tsx`
- General settings, commission/pricing, notifications, security sections

### Profile Page
- Created `apps/admin-panel/src/app/(dashboard)/profile/page.tsx`
- Profile information editing and password change with validation

### CSV Export
- Created `apps/admin-panel/src/lib/export-csv.ts`
- Added export buttons to orders, customers, drivers, fleets, operators pages
- Exports up to 1000 records with proper column formatting

### Order Details Modal
- Created `apps/admin-panel/src/components/order-details-modal.tsx`
- Comprehensive order view with timeline, customer/driver info, locations

### Date Range Picker
- Created `apps/admin-panel/src/components/date-range-picker.tsx`
- Quick presets (Today, Last 7 days, etc.) and custom range selection
- Added to orders page

### Breadcrumbs Navigation
- Created `apps/admin-panel/src/components/breadcrumbs.tsx`
- Auto-generates from pathname with friendly labels

### Bulk Actions
- Added to customers page with multi-select and bulk delete
- Selection highlighting and confirmation dialog

---

## Pending Tasks

- [x] Add edit functionality for Drivers
- [x] Add edit functionality for Services
- [x] Fix login error message not showing (401 redirect issue)
- [x] Dark mode toggle
- [x] Settings page
- [x] Profile page with password change
- [x] CSV export functionality
- [x] Order details modal
- [x] Date range filters
- [x] Breadcrumbs navigation
- [x] Bulk actions for customers
- [x] Fix customer status display bug (showed "Inactive" for all customers)

---

### 17. Customer Status Display Bug (Always Showing "Inactive")

**Error:** All customers showed "Inactive" status even when they were active.

**Cause:** Frontend `Customer` interface had `isActive: boolean` but backend returns `status: 'enabled' | 'disabled'`. Since `customer.isActive` was undefined, it always evaluated as falsy.

**Fix:**
1. Updated `apps/admin-panel/src/lib/api.ts`:
   - Changed `Customer` interface from `isActive: boolean` to `status: 'enabled' | 'disabled'`
   - Changed `UpdateCustomerDto` from `isActive?: boolean` to `status?: 'enabled' | 'disabled'`

2. Updated `apps/admin-panel/src/app/(dashboard)/customers/page.tsx`:
   - Changed status display from `customer.isActive` to `customer.status === 'enabled'`
   - Changed edit form from checkbox to dropdown with "Active"/"Inactive" options
   - Added dark mode support for status badges

---

## Pending Tasks

- [ ] Test customer creation with different phone numbers
- [ ] Test profile update and password change functionality
- [ ] Test bulk delete on customers page
- [ ] Test CSV export on all pages
- [ ] Test date range filter on orders page
- [ ] Add bulk actions to drivers, orders pages
