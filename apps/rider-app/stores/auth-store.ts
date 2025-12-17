import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  gender?: string;
  avatar?: string;
  walletBalance: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => Promise<void>;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
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
      storage.setItem('authUser', JSON.stringify(user));
    } else {
      storage.removeItem('authUser');
    }
  },

  setToken: async (token) => {
    if (token) {
      await storage.setItem('authToken', token);
    } else {
      await storage.removeItem('authToken');
    }
    set({ token });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  logout: async () => {
    await storage.removeItem('authToken');
    await storage.removeItem('authUser');
    set({ user: null, isAuthenticated: false, token: null });
  },

  loadStoredAuth: async () => {
    try {
      const token = await storage.getItem('authToken');
      const userJson = await storage.getItem('authUser');
      if (token) {
        const user = userJson ? JSON.parse(userJson) : null;
        set({ token, isAuthenticated: true, user });
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
