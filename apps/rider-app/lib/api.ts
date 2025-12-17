import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Cross-platform storage helpers
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
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

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.removeItem('authToken');
      // Handle logout - redirect to login
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

  calculateFare: (data: {
    serviceId: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
  }) => api.post('/orders/calculate', data),

  createOrder: (data: {
    serviceId: string;
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

  getOrderHistory: (page = 1, limit = 20) =>
    api.get(`/orders/history?page=${page}&limit=${limit}`),

  getOrderDetails: (orderId: string) => api.get(`/orders/${orderId}`),

  cancelOrder: (orderId: string, reasonId?: string, note?: string) =>
    api.post(`/orders/${orderId}/cancel`, { reasonId, note }),

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
  getAvailableCoupons: () => api.get('/coupons/available'),

  validateCoupon: (code: string, serviceId: string) =>
    api.post('/coupons/validate', { code, serviceId }),
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
