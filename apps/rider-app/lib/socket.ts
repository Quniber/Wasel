import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Connect to centralized socket-api service
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://api.waselapp.qa';

// Helper to get token cross-platform
const getAuthToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('accessToken');
  }
  return await SecureStore.getItemAsync('accessToken');
};

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  // In-flight connection guard. connect() is called from several screens that
  // can fire near-simultaneously (main layout mount, finding-driver, ride-active).
  // Without this, two concurrent calls both pass the `connected` check while
  // awaiting the token, and each creates a separate io() socket — each registering
  // its own onAny handler that dispatches every event to the SHARED listener set.
  // That produced the duplicate logs and double navigation (the white-screen flash).
  private connectPromise: Promise<void> | null = null;

  async connect() {
    console.log('[Socket] connect() called');
    if (this.socket?.connected) {
      console.log('[Socket] Already connected, skipping');
      return;
    }
    // A connection attempt is already in flight — reuse it instead of starting a
    // second one. This dedupes concurrent callers down to a single socket.
    if (this.connectPromise) {
      console.log('[Socket] Connection already in progress, awaiting it');
      return this.connectPromise;
    }
    // A socket already exists but isn't "connected" yet (socket.io is handling
    // reconnection internally). Don't create a parallel instance.
    if (this.socket) {
      console.log('[Socket] Socket exists (reconnecting), skipping');
      return;
    }

    this.connectPromise = (async () => {
      const token = await getAuthToken();
      console.log('[Socket] Token:', token ? 'exists' : 'missing');
      console.log('[Socket] Connecting to:', SOCKET_URL);

      this.socket = io(SOCKET_URL, {
        path: '/socket-api/socket.io',
        auth: { token, type: 'rider' },
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected! Socket ID:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
      });

      this.socket.on('error', (error) => {
        console.error('[Socket] Error:', error);
      });

      // Re-emit events to registered listeners (registered exactly once per socket)
      this.socket.onAny((event, ...args) => {
        console.log('[Socket] Received event:', event, args);
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach((callback) => callback(...args));
        }
      });
    })();

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  disconnect() {
    this.connectPromise = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Force reconnect with fresh token (call after login)
  async reconnect() {
    console.log('[Socket] Reconnecting with fresh token...');
    this.disconnect();
    await this.connect();
  }

  // Subscribe to events
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // Emit events
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      console.log('[Socket] Emitting event:', event, data);
      this.socket.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit - not connected. Event:', event);
    }
  }

  // Join a room (e.g., for order tracking)
  joinOrderRoom(orderId: number | string) {
    console.log('[Socket] Joining order room:', orderId, 'Socket connected:', this.socket?.connected);
    this.emit('join:order', { orderId: Number(orderId) });
  }

  leaveOrderRoom(orderId: number | string) {
    this.emit('leave:order', { orderId: Number(orderId) });
  }

  // Track an order (rider-specific)
  trackOrder(orderId: number | string) {
    this.emit('order:track', { orderId: Number(orderId) });
  }
}

export const socketService = new SocketService();

// Socket event types
export interface DriverLocationUpdate {
  orderId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    mobileNumber: string;
    rating: number;
    carModel: string;
    carColor: string;
    carPlate: string;
    latitude: number;
    longitude: number;
  };
  eta?: number;
}

export interface ChatMessage {
  orderId: string;
  senderId: string;
  senderType: 'rider' | 'driver';
  message: string;
  timestamp: string;
}

export default socketService;
