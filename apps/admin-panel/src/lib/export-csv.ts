/**
 * Utility for exporting data to CSV format
 */

interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: any, row: T) => string;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  if (data.length === 0) {
    return;
  }

  // Create CSV header row
  const headers = columns.map((col) => `"${col.header}"`).join(',');

  // Create CSV data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value: any;

        // Handle nested keys like "customer.firstName"
        if (typeof col.key === 'string' && col.key.includes('.')) {
          const keys = col.key.split('.');
          value = keys.reduce((obj, key) => obj?.[key], row);
        } else {
          value = row[col.key as keyof T];
        }

        // Apply formatter if provided
        if (col.formatter) {
          value = col.formatter(value, row);
        }

        // Handle different value types
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'string') {
          // Escape double quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
        // For objects/arrays, stringify
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  // Combine headers and rows
  const csv = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Pre-defined column configurations for common entities

export const orderColumns = [
  { key: 'id', header: 'Order ID' },
  { key: 'status', header: 'Status' },
  { key: 'customer.firstName', header: 'Customer First Name' },
  { key: 'customer.lastName', header: 'Customer Last Name' },
  { key: 'customer.mobileNumber', header: 'Customer Phone' },
  { key: 'driver.firstName', header: 'Driver First Name' },
  { key: 'driver.lastName', header: 'Driver Last Name' },
  { key: 'pickupAddress', header: 'Pickup Address' },
  { key: 'dropoffAddress', header: 'Dropoff Address' },
  { key: 'estimatedFare', header: 'Estimated Fare' },
  { key: 'finalFare', header: 'Final Fare' },
  { key: 'distance', header: 'Distance (m)' },
  { key: 'duration', header: 'Duration (min)' },
  {
    key: 'createdAt',
    header: 'Created At',
    formatter: (value: string) => (value ? new Date(value).toLocaleString() : ''),
  },
  {
    key: 'completedAt',
    header: 'Completed At',
    formatter: (value: string) => (value ? new Date(value).toLocaleString() : ''),
  },
];

export const customerColumns = [
  { key: 'id', header: 'Customer ID' },
  { key: 'firstName', header: 'First Name' },
  { key: 'lastName', header: 'Last Name' },
  { key: 'mobileNumber', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'isActive', header: 'Active', formatter: (value: boolean) => (value ? 'Yes' : 'No') },
  { key: '_count.orders', header: 'Total Orders' },
  {
    key: 'createdAt',
    header: 'Registered At',
    formatter: (value: string) => (value ? new Date(value).toLocaleString() : ''),
  },
];

export const driverColumns = [
  { key: 'id', header: 'Driver ID' },
  { key: 'firstName', header: 'First Name' },
  { key: 'lastName', header: 'Last Name' },
  { key: 'mobileNumber', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'status', header: 'Status' },
  { key: 'carPlate', header: 'Car Plate' },
  { key: 'carModel.name', header: 'Car Model' },
  { key: 'carColor.name', header: 'Car Color' },
  { key: 'rating', header: 'Rating' },
  { key: 'reviewCount', header: 'Reviews' },
  { key: 'walletBalance', header: 'Wallet Balance' },
  { key: 'fleet.name', header: 'Fleet' },
  { key: 'isActive', header: 'Active', formatter: (value: boolean) => (value ? 'Yes' : 'No') },
  {
    key: 'createdAt',
    header: 'Registered At',
    formatter: (value: string) => (value ? new Date(value).toLocaleString() : ''),
  },
];

export const fleetColumns = [
  { key: 'id', header: 'Fleet ID' },
  { key: 'name', header: 'Name' },
  { key: 'commissionSharePercent', header: 'Commission %' },
  { key: 'phoneNumber', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'address', header: 'Address' },
  { key: '_count.drivers', header: 'Total Drivers' },
  { key: 'isActive', header: 'Active', formatter: (value: boolean) => (value ? 'Yes' : 'No') },
  {
    key: 'createdAt',
    header: 'Created At',
    formatter: (value: string) => (value ? new Date(value).toLocaleString() : ''),
  },
];

export const couponColumns = [
  { key: 'id', header: 'Coupon ID' },
  { key: 'code', header: 'Code' },
  { key: 'title', header: 'Title' },
  { key: 'description', header: 'Description' },
  { key: 'discountType', header: 'Discount Type' },
  { key: 'discountAmount', header: 'Discount Amount' },
  { key: 'minimumOrderAmount', header: 'Min Order Amount' },
  { key: 'maximumDiscount', header: 'Max Discount' },
  { key: 'usageLimit', header: 'Usage Limit' },
  { key: 'usedCount', header: 'Used Count' },
  { key: 'isActive', header: 'Active', formatter: (value: boolean) => (value ? 'Yes' : 'No') },
];

export const operatorColumns = [
  { key: 'id', header: 'Operator ID' },
  { key: 'firstName', header: 'First Name' },
  { key: 'lastName', header: 'Last Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'isActive', header: 'Active', formatter: (value: boolean) => (value ? 'Yes' : 'No') },
  {
    key: 'createdAt',
    header: 'Created At',
    formatter: (value: string) => (value ? new Date(value).toLocaleString() : ''),
  },
  {
    key: 'lastLogin',
    header: 'Last Login',
    formatter: (value: string) => (value ? new Date(value).toLocaleString() : 'Never'),
  },
];
