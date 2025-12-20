import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { sessionManager, SessionTokens, getDeviceInfo } from '@/lib/session';

export interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  gender?: string;
  avatar?: string;
  rating: number;
  totalTrips: number;
  isVerified: boolean;
  documentsStatus: 'pending' | 'approved' | 'rejected' | 'incomplete';
  vehicle?: {
    id: number;
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
  };
}

interface AuthState {
  user: Driver | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;

  setUser: (user: Driver | null) => void;
  setToken: (token: string | null) => Promise<void>;
  setSession: (tokens: SessionTokens, user: Driver) => Promise<void>;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  getDeviceInfo: () => ReturnType<typeof getDeviceInfo>;
}

// Helper functions for cross-platform storage
const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    // Also persist user to storage
    if (user) {
      sessionManager.saveUser(user);
    }
  },

  setToken: async (token) => {
    if (token) {
      await storage.setItem('accessToken', token);
    } else {
      await storage.removeItem('accessToken');
    }
    set({ token });
  },

  // New method to save session with tokens
  setSession: async (tokens: SessionTokens, user: Driver) => {
    await sessionManager.saveSession(tokens);
    await sessionManager.saveUser(user);
    set({
      user,
      token: tokens.accessToken,
      isAuthenticated: true
    });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  logout: async () => {
    await sessionManager.logout();
    set({ user: null, isAuthenticated: false, token: null });
  },

  logoutEverywhere: async () => {
    await sessionManager.logoutEverywhere();
    set({ user: null, isAuthenticated: false, token: null });
  },

  loadStoredAuth: async () => {
    try {
      const isAuth = await sessionManager.isAuthenticated();
      if (isAuth) {
        const accessToken = await sessionManager.getValidAccessToken();
        const user = await sessionManager.getUser();
        if (accessToken && user) {
          set({ token: accessToken, isAuthenticated: true, user });
        } else {
          // Clear invalid session
          await sessionManager.clearSession();
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      await sessionManager.clearSession();
    } finally {
      set({ isLoading: false });
    }
  },

  getDeviceInfo,
}));
