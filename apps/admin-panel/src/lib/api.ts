import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Custom error class for better error identification
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Helper to get user-friendly error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return error.message;
  }

  if (axios.isAxiosError(error)) {
    // Network error (no response received)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return 'Request timed out. Please check your connection and try again.';
      }
      if (error.code === 'ERR_NETWORK') {
        return 'Network error. Please check your internet connection.';
      }
      return 'Unable to connect to server. Please check your connection.';
    }

    // Server responded with error
    const status = error.response.status;
    const data = error.response.data as { message?: string };

    if (data?.message) {
      return data.message;
    }

    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return `Request failed (${status}). Please try again.`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout - fail quickly when offline
    });

    // Request interceptor - check network before making request
    this.client.interceptors.request.use(
      (config) => {
        // Check if browser is online before making request
        if (typeof window !== 'undefined' && !navigator.onLine) {
          return Promise.reject(new NetworkError('You are offline. Please check your internet connection.'));
        }

        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Handle 401 unauthorized
        if (error.response?.status === 401) {
          this.token = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            // Only redirect if not already on login page (avoid redirect loop)
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
        }

        // Convert network errors to our custom error with better message
        if (!error.response) {
          const message = getErrorMessage(error);
          return Promise.reject(new NetworkError(message));
        }

        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
  }

  // Auth
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

  // Dashboard
  async getDashboardStats() {
    const response = await this.client.get<DashboardStats>('/dashboard/stats');
    return response.data;
  }

  async getRecentOrders(limit = 10) {
    const response = await this.client.get<Order[]>('/dashboard/recent-orders', {
      params: { limit },
    });
    return response.data;
  }

  async getOrdersByStatus() {
    const response = await this.client.get<OrdersByStatus>('/dashboard/orders-by-status');
    return response.data;
  }

  async getRevenueByDate(startDate: string, endDate: string) {
    const response = await this.client.get<RevenueByDate[]>('/dashboard/revenue-by-date', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  // Customers
  async getCustomers(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get<{ customers: Customer[]; total: number; page: number; limit: number }>('/customers', { params });
    // Transform backend response to expected format
    return {
      data: response.data.customers,
      meta: {
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: Math.ceil(response.data.total / response.data.limit),
      },
    };
  }

  async getCustomer(id: number) {
    const response = await this.client.get<Customer>(`/customers/${id}`);
    return response.data;
  }

  async createCustomer(data: CreateCustomerDto) {
    const response = await this.client.post<Customer>('/customers', data);
    return response.data;
  }

  async updateCustomer(id: number, data: UpdateCustomerDto) {
    const response = await this.client.patch<Customer>(`/customers/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id: number) {
    await this.client.delete(`/customers/${id}`);
  }

  async getCustomerWallet(customerId: number) {
    const response = await this.client.get<CustomerWallet>(`/customers/${customerId}/wallet`);
    return response.data;
  }

  async adjustCustomerWallet(customerId: number, amount: number, type: 'credit' | 'debit', description: string) {
    const response = await this.client.post(`/customers/${customerId}/wallet/adjust`, { amount, type, description });
    return response.data;
  }

  async getCustomerOrders(customerId: number, params?: { page?: number; limit?: number }) {
    const response = await this.client.get<{ orders: Order[]; total: number; page: number; limit: number }>(`/customers/${customerId}/orders`, { params });
    return response.data;
  }

  async getCustomerStats(customerId: number) {
    const response = await this.client.get<CustomerStats>(`/customers/${customerId}/stats`);
    return response.data;
  }

  async getCustomerNotes(customerId: number) {
    const response = await this.client.get<CustomerNote[]>(`/customers/${customerId}/notes`);
    return response.data;
  }

  async addCustomerNote(customerId: number, note: string) {
    const response = await this.client.post<CustomerNote>(`/customers/${customerId}/notes`, { note });
    return response.data;
  }

  async getCustomerAddresses(customerId: number) {
    const response = await this.client.get<CustomerAddress[]>(`/customers/${customerId}/addresses`);
    return response.data;
  }

  // Drivers
  async getDrivers(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const response = await this.client.get<{ drivers: Driver[]; total: number; page: number; limit: number }>('/drivers', { params });
    // Transform backend response to expected format
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

  async getDriversWithLocations(params?: { status?: string }) {
    const response = await this.client.get<{ drivers: Driver[]; total: number; page: number; limit: number }>('/drivers/locations', { params });
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

  async getDriver(id: number) {
    const response = await this.client.get<Driver>(`/drivers/${id}`);
    return response.data;
  }

  async createDriver(data: CreateDriverDto) {
    const response = await this.client.post<Driver>('/drivers', data);
    return response.data;
  }

  async registerDriver(data: RegisterDriverDto) {
    const response = await this.client.post<Driver>('/drivers/register', data);
    return response.data;
  }

  async uploadDriverDocument(driverId: number, data: UploadDocumentDto) {
    const response = await this.client.post<DriverDocument>(`/drivers/${driverId}/documents`, data);
    return response.data;
  }

  async updateDriver(id: number, data: UpdateDriverDto) {
    const response = await this.client.patch<Driver>(`/drivers/${id}`, data);
    return response.data;
  }

  async deleteDriver(id: number) {
    await this.client.delete(`/drivers/${id}`);
  }

  async updateDriverStatus(id: number, status: string) {
    const response = await this.client.patch<Driver>(`/drivers/${id}/status`, { status });
    return response.data;
  }

  async getDriverDocuments(driverId: number) {
    const response = await this.client.get<DriverDocument[]>(`/drivers/${driverId}/documents`);
    return response.data;
  }

  async verifyDriverDocument(documentId: number) {
    const response = await this.client.patch(`/drivers/documents/${documentId}/verify`);
    return response.data;
  }

  async rejectDriverDocument(documentId: number, rejectionNote: string) {
    const response = await this.client.patch(`/drivers/documents/${documentId}/reject`, { rejectionNote });
    return response.data;
  }

  async getDriverWallet(driverId: number) {
    const response = await this.client.get<DriverWallet>(`/drivers/${driverId}/wallet`);
    return response.data;
  }

  async adjustDriverWallet(driverId: number, amount: number, type: 'credit' | 'debit', description: string) {
    const response = await this.client.post(`/drivers/${driverId}/wallet/adjust`, { amount, type, description });
    return response.data;
  }

  async getDriverOrders(driverId: number, params?: { page?: number; limit?: number }) {
    const response = await this.client.get<{ orders: Order[]; total: number; page: number; limit: number }>(`/drivers/${driverId}/orders`, { params });
    return response.data;
  }

  async getDriverStats(driverId: number) {
    const response = await this.client.get<DriverStats>(`/drivers/${driverId}/stats`);
    return response.data;
  }

  async getDriverNotes(driverId: number) {
    const response = await this.client.get<DriverNote[]>(`/drivers/${driverId}/notes`);
    return response.data;
  }

  async addDriverNote(driverId: number, note: string) {
    const response = await this.client.post<DriverNote>(`/drivers/${driverId}/notes`, { note });
    return response.data;
  }

  // Orders
  async getOrders(params?: { page?: number; limit?: number; status?: string; customerId?: number; driverId?: number }) {
    const response = await this.client.get<{ orders: Order[]; total: number; page: number; limit: number }>('/orders', { params });
    // Transform backend response to expected format
    return {
      data: response.data.orders,
      meta: {
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: Math.ceil(response.data.total / response.data.limit),
      },
    };
  }

  async getOrder(id: number) {
    const response = await this.client.get<Order>(`/orders/${id}`);
    return response.data;
  }

  async createOrder(data: CreateOrderDto) {
    const response = await this.client.post<Order>('/orders', data);
    return response.data;
  }

  async updateOrderStatus(id: number, status: string) {
    const response = await this.client.patch<Order>(`/orders/${id}/status`, { status });
    return response.data;
  }

  async assignDriver(orderId: number, driverId: number) {
    const response = await this.client.patch<Order>(`/orders/${orderId}/assign`, { driverId });
    return response.data;
  }

  async cancelOrder(id: number, reason?: string) {
    const response = await this.client.patch<Order>(`/orders/${id}/cancel`, { reason });
    return response.data;
  }

  // Services
  async getServices(params?: { page?: number; limit?: number; isActive?: boolean }) {
    const response = await this.client.get<Service[]>('/services', { params });
    // Backend returns array, wrap it in paginated format for consistency
    const services = response.data;
    return {
      data: services,
      meta: {
        total: services.length,
        page: params?.page || 1,
        limit: params?.limit || services.length,
        totalPages: 1,
      },
    };
  }

  async getService(id: number) {
    const response = await this.client.get<Service>(`/services/${id}`);
    return response.data;
  }

  async createService(data: CreateServiceDto) {
    const response = await this.client.post<Service>('/services', data);
    return response.data;
  }

  async updateService(id: number, data: UpdateServiceDto) {
    const response = await this.client.patch<Service>(`/services/${id}`, data);
    return response.data;
  }

  async deleteService(id: number) {
    await this.client.delete(`/services/${id}`);
  }

  // Fleets
  async getFleets(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get<PaginatedResponse<Fleet>>('/fleets', { params });
    return response.data;
  }

  async getFleet(id: number) {
    const response = await this.client.get<Fleet>(`/fleets/${id}`);
    return response.data;
  }

  async createFleet(data: CreateFleetDto) {
    const response = await this.client.post<Fleet>('/fleets', data);
    return response.data;
  }

  async updateFleet(id: number, data: UpdateFleetDto) {
    const response = await this.client.patch<Fleet>(`/fleets/${id}`, data);
    return response.data;
  }

  async deleteFleet(id: number) {
    await this.client.delete(`/fleets/${id}`);
  }

  async getFleetStats(id: number) {
    const response = await this.client.get<FleetStats>(`/fleets/${id}/stats`);
    return response.data;
  }

  async getFleetDrivers(id: number, params?: { page?: number; limit?: number }) {
    const response = await this.client.get<{ drivers: Driver[]; total: number; page: number; limit: number }>(`/fleets/${id}/drivers`, { params });
    return response.data;
  }

  async addDriverToFleet(fleetId: number, driverId: number) {
    const response = await this.client.post<Driver>(`/fleets/${fleetId}/drivers/${driverId}`);
    return response.data;
  }

  async removeDriverFromFleet(fleetId: number, driverId: number) {
    const response = await this.client.delete(`/fleets/${fleetId}/drivers/${driverId}`);
    return response.data;
  }

  async getFleetOrders(id: number, params?: { page?: number; limit?: number }) {
    const response = await this.client.get<{ orders: Order[]; total: number; page: number; limit: number }>(`/fleets/${id}/orders`, { params });
    return response.data;
  }

  async getFleetWallet(id: number) {
    const response = await this.client.get<FleetWallet>(`/fleets/${id}/wallet`);
    return response.data;
  }

  async adjustFleetWallet(id: number, amount: number, type: 'credit' | 'debit', description: string) {
    const response = await this.client.post<Transaction>(`/fleets/${id}/wallet/adjust`, { amount, type, description });
    return response.data;
  }

  // Coupons
  async getCoupons(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get<PaginatedResponse<Coupon>>('/coupons', { params });
    return response.data;
  }

  async getCoupon(id: number) {
    const response = await this.client.get<Coupon>(`/coupons/${id}`);
    return response.data;
  }

  async createCoupon(data: CreateCouponDto) {
    const response = await this.client.post<Coupon>('/coupons', data);
    return response.data;
  }

  async updateCoupon(id: number, data: UpdateCouponDto) {
    const response = await this.client.patch<Coupon>(`/coupons/${id}`, data);
    return response.data;
  }

  async deleteCoupon(id: number) {
    await this.client.delete(`/coupons/${id}`);
  }

  // Payments
  async getCustomerTransactions(params?: { page?: number; limit?: number }) {
    const response = await this.client.get<{ transactions: Transaction[]; pagination: Pagination }>('/payments/customer-transactions', { params });
    return response.data;
  }

  async getDriverTransactions(params?: { page?: number; limit?: number }) {
    const response = await this.client.get<{ transactions: Transaction[]; pagination: Pagination }>('/payments/driver-transactions', { params });
    return response.data;
  }

  async getPaymentStats() {
    const response = await this.client.get<PaymentStats>('/payments/stats');
    return response.data;
  }

  // Support / Complaints
  async getComplaints(params?: { page?: number; limit?: number; status?: string }) {
    const response = await this.client.get<PaginatedResponse<Complaint>>('/complaints', { params });
    return response.data;
  }

  async getComplaint(id: number) {
    const response = await this.client.get<Complaint>(`/complaints/${id}`);
    return response.data;
  }

  async updateComplaintStatus(id: number, status: string, response?: string) {
    const result = await this.client.patch<Complaint>(`/complaints/${id}`, { status, response });
    return result.data;
  }

  // Operators (Admin users)
  async getOperators(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get<PaginatedResponse<Operator>>('/operators', { params });
    return response.data;
  }

  async getOperator(id: number) {
    const response = await this.client.get<Operator>(`/operators/${id}`);
    return response.data;
  }

  async createOperator(data: CreateOperatorDto) {
    const response = await this.client.post<Operator>('/operators', data);
    return response.data;
  }

  async updateOperator(id: number, data: UpdateOperatorDto) {
    const response = await this.client.patch<Operator>(`/operators/${id}`, data);
    return response.data;
  }

  async deleteOperator(id: number) {
    await this.client.delete(`/operators/${id}`);
  }

  // Settings - Document Types
  async getDocumentTypes(includeInactive = false) {
    const response = await this.client.get<DocumentType[]>('/settings/document-types', {
      params: { includeInactive: includeInactive.toString() },
    });
    return response.data;
  }

  async createDocumentType(data: CreateDocumentTypeDto) {
    const response = await this.client.post<DocumentType>('/settings/document-types', data);
    return response.data;
  }

  async updateDocumentType(id: number, data: UpdateDocumentTypeDto) {
    const response = await this.client.patch<DocumentType>(`/settings/document-types/${id}`, data);
    return response.data;
  }

  async deleteDocumentType(id: number) {
    await this.client.delete(`/settings/document-types/${id}`);
  }

  // Settings - Car Models
  async getCarModels(includeInactive = false) {
    const response = await this.client.get<CarModel[]>('/settings/car-models', {
      params: { includeInactive: includeInactive.toString() },
    });
    return response.data;
  }

  async createCarModel(data: { brand: string; model: string; year?: number; isActive?: boolean }) {
    const response = await this.client.post<CarModel>('/settings/car-models', data);
    return response.data;
  }

  async updateCarModel(id: number, data: { brand?: string; model?: string; year?: number; isActive?: boolean }) {
    const response = await this.client.patch<CarModel>(`/settings/car-models/${id}`, data);
    return response.data;
  }

  async deleteCarModel(id: number) {
    await this.client.delete(`/settings/car-models/${id}`);
  }

  // Settings - Car Colors
  async getCarColors(includeInactive = false) {
    const response = await this.client.get<CarColor[]>('/settings/car-colors', {
      params: { includeInactive: includeInactive.toString() },
    });
    return response.data;
  }

  async createCarColor(data: { name: string; hexCode?: string; isActive?: boolean }) {
    const response = await this.client.post<CarColor>('/settings/car-colors', data);
    return response.data;
  }

  async updateCarColor(id: number, data: { name?: string; hexCode?: string; isActive?: boolean }) {
    const response = await this.client.patch<CarColor>(`/settings/car-colors/${id}`, data);
    return response.data;
  }

  async deleteCarColor(id: number) {
    await this.client.delete(`/settings/car-colors/${id}`);
  }

  // Settings - Cancel Reasons
  async getCancelReasons(includeInactive = false) {
    const response = await this.client.get<CancelReason[]>('/settings/cancel-reasons', {
      params: { includeInactive: includeInactive.toString() },
    });
    return response.data;
  }

  async createCancelReason(data: { title: string; isForDriver?: boolean; isForRider?: boolean; isActive?: boolean }) {
    const response = await this.client.post<CancelReason>('/settings/cancel-reasons', data);
    return response.data;
  }

  async updateCancelReason(id: number, data: { title?: string; isForDriver?: boolean; isForRider?: boolean; isActive?: boolean }) {
    const response = await this.client.patch<CancelReason>(`/settings/cancel-reasons/${id}`, data);
    return response.data;
  }

  async deleteCancelReason(id: number) {
    await this.client.delete(`/settings/cancel-reasons/${id}`);
  }

  // Profile
  async updateProfile(data: UpdateProfileDto) {
    const response = await this.client.patch<Admin>('/auth/profile', data);
    return response.data;
  }

  async changePassword(data: ChangePasswordDto) {
    await this.client.post('/auth/change-password', data);
  }
}

export const api = new ApiClient();

// Types
export interface Admin {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalDrivers: number;
  totalOrders: number;
  totalRevenue: number;
  activeDrivers: number;
  pendingOrders: number;
}

export interface OrdersByStatus {
  pending: number;
  accepted: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

export interface RevenueByDate {
  date: string;
  revenue: number;
  orders: number;
}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  status: 'enabled' | 'disabled';
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
  };
}

export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
}

export interface UpdateCustomerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: 'enabled' | 'disabled';
}

export interface CustomerTransaction {
  id: number;
  customerId: number;
  type: 'credit' | 'debit';
  action: string;
  amount: number;
  description?: string;
  createdAt: string;
  order?: {
    id: number;
    status: string;
  };
}

export interface CustomerWallet {
  balance: number;
  transactions: CustomerTransaction[];
}

export interface CustomerStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  walletBalance: number;
  totalSpent: number;
  memberSince: string;
  lastActivity?: string;
}

export interface CustomerNote {
  id: number;
  customerId: number;
  operatorId: number;
  note: string;
  createdAt: string;
  operator?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface CustomerAddress {
  id: number;
  customerId: number;
  type: string;
  title?: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
}

export interface CustomerDetails extends Customer {
  addresses?: CustomerAddress[];
  media?: { id: number; url: string };
}

export interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  status: string;
  carPlate?: string;
  carModel?: { id: number; name: string };
  carColor?: { id: number; name: string };
  rating: number;
  reviewCount: number;
  walletBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fleet?: { id: number; name: string };
  latitude?: number;
  longitude?: number;
  lastSeenAt?: string;
}

export interface CreateDriverDto {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  carPlate?: string;
}

export interface RegisterDriverDto {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  password?: string;
  carPlate?: string;
  carModelId?: number;
  carColorId?: number;
  fleetId?: number;
  documents?: Array<{
    documentTypeId: number;
    fileUrl: string;
    fileName: string;
    mimeType?: string;
    expiryDate?: string;
  }>;
}

export interface UploadDocumentDto {
  documentTypeId: number;
  fileUrl: string;
  fileName: string;
  mimeType?: string;
  expiryDate?: string;
}

export interface UpdateDriverDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  carPlate?: string;
  carModelId?: number;
  carColorId?: number;
  status?: string;
  softRejectionNote?: string;
}

export interface DriverDocument {
  id: number;
  driverId: number;
  status: string;
  expiryDate?: string;
  rejectionNote?: string;
  verifiedAt?: string;
  createdAt: string;
  documentType?: {
    id: number;
    name: string;
  };
  media?: {
    id: number;
    url: string;
  };
}

export interface DriverTransaction {
  id: number;
  driverId: number;
  type: 'credit' | 'debit';
  action: string;
  amount: number;
  description?: string;
  createdAt: string;
  order?: {
    id: number;
    status: string;
  };
}

export interface DriverWallet {
  balance: number;
  transactions: DriverTransaction[];
}

export interface DriverStats {
  rating: number;
  reviewCount: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  acceptanceRate: string | number;
  totalEarnings: number;
}

export interface DriverNote {
  id: number;
  driverId: number;
  operatorId: number;
  note: string;
  createdAt: string;
  operator?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface DriverDetails extends Driver {
  documents?: DriverDocument[];
  enabledServices?: {
    id: number;
    serviceId: number;
    isEnabled: boolean;
    service: Service;
  }[];
}

export interface Order {
  id: number;
  status: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  estimatedFare?: number;
  finalFare?: number;
  distance?: number;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  customerId: number;
  driverId?: number;
  serviceId: number;
  customer?: Customer;
  driver?: Driver;
  service?: Service;
}

export interface CreateOrderDto {
  customerId: number;
  serviceId: number;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  driverId?: number;
}

export interface Service {
  id: number;
  name: string;
  baseFare: number;
  perKilometer: number;
  perHundredMeters: number;
  perMinuteDrive: number;
  minimumFare: number;
  personCapacity: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceDto {
  name: string;
  baseFare: number;
  perKilometer: number;
  perMinuteDrive: number;
  minimumFare: number;
  personCapacity: number;
  currency?: string;
}

export interface UpdateServiceDto {
  name?: string;
  baseFare?: number;
  perKilometer?: number;
  perMinuteDrive?: number;
  minimumFare?: number;
  personCapacity?: number;
  currency?: string;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Fleet types
export interface Fleet {
  id: number;
  name: string;
  commissionSharePercent: number;
  commissionShareFlat?: number;
  phoneNumber?: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
  accountNumber?: string;
  walletBalance?: number;
  isActive: boolean;
  isBlocked?: boolean;
  createdAt: string;
  _count?: {
    drivers: number;
    orders: number;
  };
}

export interface CreateFleetDto {
  name: string;
  commissionSharePercent: number;
  phoneNumber?: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
}

export interface UpdateFleetDto {
  name?: string;
  commissionSharePercent?: number;
  phoneNumber?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface FleetStats {
  walletBalance: number;
  totalDrivers: number;
  activeDrivers: number;
  totalOrders: number;
  completedOrders: number;
  commissionPercent: number;
  commissionFlat: number;
  totalEarnings: number;
}

export interface FleetWallet {
  balance: number;
  transactions: Transaction[];
}

// Coupon types
export interface Coupon {
  id: number;
  code: string;
  title: string;
  description?: string;
  discountType: 'fixed' | 'percent';
  discountAmount: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCouponDto {
  code: string;
  title: string;
  description?: string;
  discountType: 'fixed' | 'percent';
  discountAmount: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  isActive?: boolean;
}

export interface UpdateCouponDto {
  code?: string;
  title?: string;
  description?: string;
  discountType?: 'fixed' | 'percent';
  discountAmount?: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  isActive?: boolean;
}

// Payment types
export interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  action: string;
  amount: number;
  description?: string;
  createdAt: string;
  customer?: Customer;
  driver?: Driver;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaymentStats {
  customerTransactions: {
    totalCredits: number;
    totalDebits: number;
  };
  driverTransactions: {
    totalCredits: number;
    totalDebits: number;
  };
}

// Complaint types
export interface Complaint {
  id: number;
  subject: string;
  content: string;
  status: string;
  response?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  order?: Order;
}

// Operator types
export interface Operator {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CreateOperatorDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateOperatorDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
}

// Profile types
export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// Document Type types
export interface DocumentType {
  id: number;
  name: string;
  description?: string;
  isRequired: boolean;
  hasExpiry: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentTypeDto {
  name: string;
  description?: string;
  isRequired?: boolean;
  hasExpiry?: boolean;
  sortOrder?: number;
}

export interface UpdateDocumentTypeDto {
  name?: string;
  description?: string;
  isRequired?: boolean;
  hasExpiry?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

// Car Model types
export interface CarModel {
  id: number;
  brand: string;
  model: string;
  year?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Car Color types
export interface CarColor {
  id: number;
  name: string;
  hexCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Cancel Reason types
export interface CancelReason {
  id: number;
  title: string;
  isForDriver: boolean;
  isForRider: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: {
    orders: number;
  };
}
