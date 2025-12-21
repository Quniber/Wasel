import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { DriverStatus } from 'database';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://wasel.shafrah.qa/driver-api/api';

// Cross-platform storage helpers
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry for refresh or logout endpoints
      if (originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/logout')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;

        // Store new tokens
        const expiresAt = Date.now() + (expiresIn * 1000);
        await Promise.all([
          storage.setItem('accessToken', accessToken),
          storage.setItem('refreshToken', newRefreshToken),
          storage.setItem('tokenExpiresAt', expiresAt.toString()),
        ]);

        processQueue(null, accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Clear all tokens on refresh failure
        await Promise.all([
          storage.removeItem('accessToken'),
          storage.removeItem('refreshToken'),
          storage.removeItem('tokenExpiresAt'),
          storage.removeItem('authUser'),
        ]);

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth APIs - matches auth.controller.ts
export const authApi = {
  // Phone-based OTP registration - Step 1: Request OTP
  registerWithPhone: (mobileNumber: string) =>
    api.post('/auth/register', { mobileNumber }),

  // Phone-based OTP registration - Step 2: Verify OTP and complete registration
  verifyOtpAndRegister: (data: {
    mobileNumber: string;
    otp: string;
    firstName: string;
    lastName: string;
    email?: string;
  }) => api.post('/auth/verify-otp', data),

  // Phone-based login - Request OTP
  loginWithPhone: (mobileNumber: string) =>
    api.post('/auth/login', { mobileNumber }),

  // Phone-based login - Verify OTP
  verifyOtpLogin: (data: { mobileNumber: string; otp: string }) =>
    api.post('/auth/login/verify-otp', data),

  // Resend OTP
  resendOtp: (mobileNumber: string) =>
    api.post('/auth/resend-otp', { mobileNumber }),

  // Driver application with documents (email-based registration)
  submitApplication: (formData: FormData) =>
    api.post('/auth/apply', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Email-based login
  loginWithEmail: (data: { email: string; password: string }) =>
    api.post('/auth/login/email', data),

  // Email-based registration (simple signup)
  registerWithEmail: (data: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    password: string;
  }) => api.post('/auth/register/email', data),

  // Profile
  getProfile: () => api.get('/auth/profile'),

  updateProfile: (data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    gender: string;
    countryIso: string;
    address: string;
    certificateNumber: string;
    carPlate: string;
    carModelId: number;
    carColorId: number;
    carProductionYear: number;
    presetAvatarNumber: number;
  }>) => api.patch('/auth/profile', data),

  // Update avatar
  updateAvatar: (mediaId: number) =>
    api.post('/auth/profile/avatar', { mediaId }),

  // Update driver status (Online/Offline/InRide)
  updateStatus: (status: DriverStatus) =>
    api.patch('/auth/status', { status }),

  // Update location
  updateLocation: (latitude: number, longitude: number) =>
    api.patch('/auth/location', { latitude, longitude }),

  // Notification token
  updateNotificationToken: (token: string) =>
    api.post('/auth/notification-token', { token }),
};

// Driver APIs - convenience wrappers around auth endpoints
export const driverApi = {
  // Go online
  goOnline: () => authApi.updateStatus('online' as DriverStatus),

  // Go offline
  goOffline: () => authApi.updateStatus('offline' as DriverStatus),

  // Update location
  updateLocation: (latitude: number, longitude: number) =>
    authApi.updateLocation(latitude, longitude),

  // Update profile (vehicle info included)
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    carPlate?: string;
    carModelId?: number;
    carColorId?: number;
    carProductionYear?: number;
  }) => authApi.updateProfile(data),
};

// Order APIs - matches orders.controller.ts
export const ordersApi = {
  // Get available orders nearby
  getAvailable: () => api.get('/orders/available'),

  // Get current active order
  getCurrentOrder: () => api.get('/orders/current'),

  // Get order history
  getHistory: (page = 1, limit = 20) =>
    api.get('/orders/my', { params: { page, limit } }),

  // Get cancel reasons
  getCancelReasons: () => api.get('/orders/cancel-reasons'),

  // Get order details
  getDetails: (orderId: number) => api.get(`/orders/${orderId}`),

  // Accept order
  accept: (orderId: number) => api.post(`/orders/${orderId}/accept`),

  // Reject order
  reject: (orderId: number, reason?: string) =>
    api.post(`/orders/${orderId}/reject`, { reason }),

  // Driver arrived at pickup
  arrive: (orderId: number) => api.patch(`/orders/${orderId}/arrived`),

  // Start ride
  startRide: (orderId: number) => api.patch(`/orders/${orderId}/start`),

  // Complete ride
  completeRide: (orderId: number) => api.patch(`/orders/${orderId}/complete`),

  // Cancel ride
  cancelRide: (orderId: number, reasonId?: number) =>
    api.patch(`/orders/${orderId}/cancel`, { reasonId }),

  // Get chat messages
  getMessages: (orderId: number) => api.get(`/orders/${orderId}/messages`),

  // Send chat message
  sendMessage: (orderId: number, content: string) =>
    api.post(`/orders/${orderId}/messages`, { content }),
};

// Document APIs - matches documents.controller.ts
export const documentsApi = {
  // Get required document types (public)
  getRequired: () => api.get('/documents/required'),

  // Get my uploaded documents
  getMyDocuments: () => api.get('/documents/my'),

  // Get document submission status
  getStatus: () => api.get('/documents/status'),

  // Upload document
  upload: (data: { documentTypeId: number; mediaId: number; expiryDate?: string }) =>
    api.post('/documents', data),

  // Delete document
  delete: (documentId: number) => api.delete(`/documents/${documentId}`),
};

// Earnings APIs - matches earnings.controller.ts
export const earningsApi = {
  // Get today's earnings
  getToday: () => api.get('/earnings/today'),

  // Get this week's earnings
  getWeek: () => api.get('/earnings/week'),

  // Get earnings history
  getHistory: (page = 1, limit = 20, startDate?: string, endDate?: string) =>
    api.get('/earnings/history', { params: { page, limit, startDate, endDate } }),
};

// Wallet APIs - matches earnings.controller.ts (wallet endpoints)
export const walletApi = {
  // Get wallet balance
  getBalance: () => api.get('/wallet'),

  // Get wallet transactions
  getTransactions: (page = 1, limit = 20) =>
    api.get('/wallet/transactions', { params: { page, limit } }),

  // Request withdrawal
  requestWithdrawal: (amount: number, bankInfo?: string) =>
    api.post('/wallet/withdraw', { amount, bankInfo }),

  // Get payout history
  getPayouts: (page = 1, limit = 20) =>
    api.get('/wallet/payouts', { params: { page, limit } }),
};

// Services APIs - matches services.controller.ts
export const servicesApi = {
  // Get all available services
  getAll: () => api.get('/services'),

  // Get my enabled services
  getMyServices: () => api.get('/services/my'),

  // Update my services (bulk)
  updateMyServices: (serviceIds: number[]) =>
    api.patch('/services/my', { serviceIds }),

  // Toggle a single service
  toggleService: (serviceId: number, enabled: boolean) =>
    api.patch(`/services/${serviceId}/toggle`, { enabled }),
};

// Notification APIs
export const notificationApi = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export default api;
