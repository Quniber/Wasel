import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://wasel.shafrah.qa';

// Helper to get token cross-platform
const getAuthToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('accessToken');
  }
  return await SecureStore.getItemAsync('accessToken');
};

class DriverSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private locationInterval: NodeJS.Timeout | null = null;

  async connect() {
    if (this.socket?.connected) return;

    const token = await getAuthToken();

    this.socket = io(SOCKET_URL, {
      auth: { token, type: 'driver' },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Driver socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Driver socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Driver socket error:', error);
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
    this.stopLocationUpdates();
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

  // Driver-specific methods

  // Go online - start receiving orders
  goOnline() {
    this.emit('driver:online');
  }

  // Go offline - stop receiving orders
  goOffline() {
    this.emit('driver:offline');
    this.stopLocationUpdates();
  }

  // Update location manually
  updateLocation(latitude: number, longitude: number) {
    this.emit('driver:location', { latitude, longitude });
  }

  // Start continuous location updates
  startLocationUpdates(getLocation: () => Promise<{ latitude: number; longitude: number } | null>, intervalMs = 5000) {
    this.stopLocationUpdates();

    this.locationInterval = setInterval(async () => {
      const location = await getLocation();
      if (location) {
        this.updateLocation(location.latitude, location.longitude);
      }
    }, intervalMs);
  }

  // Stop location updates
  stopLocationUpdates() {
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
      this.locationInterval = null;
    }
  }

  // Accept an incoming order
  acceptOrder(orderId: number) {
    this.emit('driver:accept', { orderId });
  }

  // Reject an incoming order
  rejectOrder(orderId: number, reason?: string) {
    this.emit('driver:reject', { orderId, reason });
  }

  // Notify arrived at pickup
  arrivedAtPickup(orderId: number) {
    this.emit('driver:arrived', { orderId });
  }

  // Start ride
  startRide(orderId: number) {
    this.emit('driver:start', { orderId });
  }

  // Complete ride
  completeRide(orderId: number) {
    this.emit('driver:complete', { orderId });
  }

  // Join an order room for updates
  joinOrderRoom(orderId: number) {
    this.emit('join:order', { orderId });
  }

  // Leave an order room
  leaveOrderRoom(orderId: number) {
    this.emit('leave:order', { orderId });
  }
}

export const socketService = new DriverSocketService();

// Socket event types
export interface IncomingOrder {
  orderId: number;
  pickup: {
    address: string;
    latitude: number;
    longitude: number;
  };
  dropoff: {
    address: string;
    latitude: number;
    longitude: number;
  };
  rider: {
    id: number;
    firstName: string;
    lastName: string;
    rating: number;
  };
  estimatedFare: number;
  distance: number;
  duration: number;
  paymentMethod: string;
  expiresAt: number; // timestamp when the offer expires
}

export interface OrderStatusUpdate {
  orderId: number;
  status: 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
}

export interface RiderLocationUpdate {
  orderId: number;
  latitude: number;
  longitude: number;
}

export interface ChatMessage {
  orderId: number;
  senderId: number;
  senderType: 'rider' | 'driver';
  message: string;
  timestamp: string;
}

export default socketService;
