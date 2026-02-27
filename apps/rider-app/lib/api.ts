import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.waselapp.qa/rider-api/api/v1';

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
      if (originalRequest.url?.includes('/sessions/refresh') ||
          originalRequest.url?.includes('/sessions/logout')) {
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
        const response = await axios.post(`${API_BASE_URL}/sessions/refresh`, {
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

// Auth APIs
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

  // Email-based registration
  registerWithEmail: (data: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    password: string;
  }) => api.post('/auth/register/email', data),

  // Email-based login
  loginWithEmail: (data: { email: string; password: string }) =>
    api.post('/auth/login/email', data),

  // Profile
  getProfile: () => api.get('/auth/profile'),

  updateProfile: (data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    gender: string;
    countryIso: string;
    isResident: boolean;
    idNumber: string;
    presetAvatarNumber: number;
  }>) => api.patch('/auth/profile', data),

  // Notification token
  updateNotificationToken: (token: string) =>
    api.post('/auth/notification-token', { token }),

  // Delete account
  deleteAccount: () => api.delete('/auth/account'),
};

// Order APIs
export const orderApi = {
  getServices: () => api.get('/orders/services'),

  // Get current active order
  getCurrentOrder: () => api.get('/orders/current'),

  // Get directions from backend (proxy to Google Directions API)
  getDirections: (data: {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
  }) => api.post('/orders/directions', data),

  calculateFare: (data: {
    serviceId: number;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffLatitude: number;
    dropoffLongitude: number;
  }) => api.post('/orders/calculate', data),

  createOrder: (data: {
    serviceId: number;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    couponCode?: string;
  }) => api.post('/orders', data),

  scheduleOrder: (data: {
    serviceId: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    scheduledAt: string;
    couponCode?: string;
  }) => api.post('/orders/schedule', data),

  getScheduledOrders: () => api.get('/orders/scheduled'),

  getOrderHistory: (offset = 0, limit = 20) =>
    api.get(`/orders?limit=${limit}&offset=${offset}`),

  getOrderDetails: (orderId: string) => api.get(`/orders/${orderId}`),

  cancelOrder: (orderId: string, reasonId?: string, note?: string) =>
    api.patch(`/orders/${orderId}/cancel`, { reasonId, note }),

  rateDriver: (orderId: string, score: number, review?: string) =>
    api.post(`/orders/${orderId}/feedback`, { score, review }),
};

// Address APIs
export const addressApi = {
  getAddresses: () => api.get('/addresses'),

  createAddress: (data: {
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    type: 'home' | 'work' | 'other';
  }) => api.post('/addresses', data),

  updateAddress: (id: string, data: Partial<{
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    type: 'home' | 'work' | 'other';
  }>) => api.patch(`/addresses/${id}`, data),

  deleteAddress: (id: string) => api.delete(`/addresses/${id}`),
};

// Coupon APIs
export const couponApi = {
  getAvailableCoupons: () => api.get('/coupons'),

  validateCoupon: (code: string, serviceId?: string) =>
    api.get('/coupons/validate', { params: { code } }),
};

// Cancel Reasons
export const cancelReasonApi = {
  getCancelReasons: () => api.get('/cancel-reasons'),
};

// Notification APIs
export const notificationApi = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export default api;
