import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { api } from './api';

// Cross-platform storage helpers
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

// Session storage keys
const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  EXPIRES_AT: 'tokenExpiresAt',
  USER: 'authUser',
};

// Get device info for session tracking
export const getDeviceInfo = () => {
  return {
    deviceId: Constants.installationId || `${Platform.OS}-${Date.now()}`,
    devicePlatform: Platform.OS as 'ios' | 'android' | 'web',
    deviceModel: Platform.OS === 'web'
      ? (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : 'web')
      : `${Platform.OS}-device`,
    appVersion: Constants.expoConfig?.version || '1.0.0',
  };
};

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const sessionManager = {
  // Store session tokens
  async saveSession(tokens: SessionTokens): Promise<void> {
    const expiresAt = Date.now() + (tokens.expiresIn * 1000);
    await Promise.all([
      storage.setItem(KEYS.ACCESS_TOKEN, tokens.accessToken),
      storage.setItem(KEYS.REFRESH_TOKEN, tokens.refreshToken),
      storage.setItem(KEYS.EXPIRES_AT, expiresAt.toString()),
    ]);
  },

  // Get stored tokens
  async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null; expiresAt: number | null }> {
    const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
      storage.getItem(KEYS.ACCESS_TOKEN),
      storage.getItem(KEYS.REFRESH_TOKEN),
      storage.getItem(KEYS.EXPIRES_AT),
    ]);
    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAtStr ? parseInt(expiresAtStr, 10) : null,
    };
  },

  // Check if access token is expired or about to expire (within 60 seconds)
  async isTokenExpired(): Promise<boolean> {
    const { expiresAt } = await this.getTokens();
    if (!expiresAt) return true;
    return Date.now() >= expiresAt - 60000; // 60 seconds buffer
  },

  // Refresh access token using refresh token
  async refreshAccessToken(): Promise<string | null> {
    try {
      const { refreshToken } = await this.getTokens();
      if (!refreshToken) {
        console.log('No refresh token available');
        return null;
      }

      const response = await api.post('/sessions/refresh', { refreshToken });
      const tokens: SessionTokens = response.data;

      await this.saveSession(tokens);
      return tokens.accessToken;
    } catch (error: any) {
      console.error('Failed to refresh token:', error?.response?.data || error.message);
      // If refresh fails, clear session
      await this.clearSession();
      return null;
    }
  },

  // Get valid access token (refresh if needed)
  async getValidAccessToken(): Promise<string | null> {
    const isExpired = await this.isTokenExpired();

    if (isExpired) {
      return await this.refreshAccessToken();
    }

    const { accessToken } = await this.getTokens();
    return accessToken;
  },

  // Clear session
  async clearSession(): Promise<void> {
    await Promise.all([
      storage.removeItem(KEYS.ACCESS_TOKEN),
      storage.removeItem(KEYS.REFRESH_TOKEN),
      storage.removeItem(KEYS.EXPIRES_AT),
      storage.removeItem(KEYS.USER),
    ]);
  },

  // Logout - call API to revoke session then clear local storage
  async logout(): Promise<void> {
    try {
      const { refreshToken } = await this.getTokens();
      if (refreshToken) {
        await api.post('/sessions/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      await this.clearSession();
    }
  },

  // Store user data
  async saveUser(user: any): Promise<void> {
    await storage.setItem(KEYS.USER, JSON.stringify(user));
  },

  // Get stored user data
  async getUser(): Promise<any | null> {
    const userJson = await storage.getItem(KEYS.USER);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const { refreshToken } = await this.getTokens();
    return !!refreshToken;
  },

  // Get all active sessions
  async getActiveSessions(): Promise<any[]> {
    try {
      const response = await api.get('/sessions');
      return response.data;
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  },

  // Revoke a specific session
  async revokeSession(sessionId: number): Promise<boolean> {
    try {
      await api.delete(`/sessions/${sessionId}`);
      return true;
    } catch (error) {
      console.error('Failed to revoke session:', error);
      return false;
    }
  },

  // Revoke all other sessions
  async revokeOtherSessions(): Promise<boolean> {
    try {
      const { refreshToken } = await this.getTokens();
      await api.post('/sessions/revoke-others', { refreshToken });
      return true;
    } catch (error) {
      console.error('Failed to revoke other sessions:', error);
      return false;
    }
  },

  // Logout from all devices
  async logoutEverywhere(): Promise<boolean> {
    try {
      await api.post('/sessions/revoke-all');
      await this.clearSession();
      return true;
    } catch (error) {
      console.error('Failed to logout everywhere:', error);
      return false;
    }
  },
};

export default sessionManager;
