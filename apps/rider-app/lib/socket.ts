import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Helper to get token cross-platform
const getAuthToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('authToken');
  }
  return await SecureStore.getItemAsync('authToken');
};

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  async connect() {
    if (this.socket?.connected) return;

    const token = await getAuthToken();

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Re-emit events to registered listeners
    this.socket.onAny((event, ...args) => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach((callback) => callback(...args));
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
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
      this.socket.emit(event, data);
    }
  }

  // Join a room (e.g., for order tracking)
  joinOrderRoom(orderId: string) {
    this.emit('join-order', { orderId });
  }

  leaveOrderRoom(orderId: string) {
    this.emit('leave-order', { orderId });
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
