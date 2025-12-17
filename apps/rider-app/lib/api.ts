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
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    password: string;
  }) => api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  loginWithPhone: (data: { mobileNumber: string }) =>
    api.post('/auth/phone-login', data),

  verifyOtp: (data: { mobileNumber: string; otp: string }) =>
    api.post('/auth/verify-otp', data),

  getProfile: () => api.get('/profile'),

  updateProfile: (data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    gender: string;
  }>) => api.patch('/profile', data),
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

export default api;
