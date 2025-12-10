import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import {
  TaxiSocketServer,
  TaxiSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types';
import { createAuthMiddleware } from './auth';
import { RoomManager, DriverTracker } from './rooms';
import { registerDriverEvents, broadcastNewOrder } from './events/driver';
import { registerRiderEvents, notifyDriverFound, sendDriverLocationToRider } from './events/rider';
import { registerChatEvents, sendSystemMessage } from './events/chat';

export interface TaxiSocketServerOptions {
  jwtSecret: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  pingTimeout?: number;
  pingInterval?: number;
}

/**
 * Create and configure the taxi socket server
 */
export function createTaxiSocketServer(
  httpServer: HttpServer,
  options: TaxiSocketServerOptions
): TaxiSocketServer {
  const io: TaxiSocketServer = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: options.cors || {
      origin: '*',
      credentials: true,
    },
    pingTimeout: options.pingTimeout || 60000,
    pingInterval: options.pingInterval || 25000,
  });

  // Apply JWT authentication middleware
  io.use(createAuthMiddleware(options.jwtSecret));

  // Create room manager
  const roomManager = new RoomManager(io);

  // Handle connections
  io.on('connection', async (socket: TaxiSocket) => {
    const user = socket.data.user;

    console.log(`${user.type} ${user.id} connected (socket: ${socket.id})`);

    // Join user-specific room
    if (user.type === 'driver') {
      await roomManager.joinDriverRoom(socket);
    } else {
      await roomManager.joinRiderRoom(socket);
    }

    // Emit connected event
    socket.emit('connected', {
      userId: user.id,
      userType: user.type,
    });

    // Register event handlers based on user type
    registerDriverEvents(socket, roomManager);
    registerRiderEvents(socket, roomManager);
    registerChatEvents(socket, roomManager);

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${user.type} ${user.id}:`, error);
      socket.emit('error', {
        message: error.message || 'An error occurred',
        code: 'SOCKET_ERROR',
      });
    });
  });

  // Cleanup stale drivers periodically (every 5 minutes)
  setInterval(() => {
    const removed = DriverTracker.cleanupStale(5);
    if (removed > 0) {
      console.log(`Cleaned up ${removed} stale driver connections`);
    }
  }, 5 * 60 * 1000);

  return io;
}

/**
 * Socket service for use in API endpoints
 * Provides methods to emit events from the API layer
 */
export class SocketService {
  private io: TaxiSocketServer;
  private roomManager: RoomManager;

  constructor(io: TaxiSocketServer) {
    this.io = io;
    this.roomManager = new RoomManager(io);
  }

  // Broadcast new order to available drivers
  broadcastNewOrder(
    orderId: number,
    serviceId: number,
    orderData: {
      pickupAddress: string;
      pickupLatitude: number;
      pickupLongitude: number;
      dropoffAddress: string;
      dropoffLatitude: number;
      dropoffLongitude: number;
      serviceName: string;
      estimatedFare: number;
      customerId: number;
      customerName: string;
    }
  ): void {
    broadcastNewOrder(this.roomManager, orderId, serviceId, orderData);
  }

  // Notify rider about driver assignment
  notifyDriverFound(
    riderId: number,
    orderId: number,
    driverData: {
      driverId: number;
      driverName: string;
      driverPhone: string;
      driverRating: number;
      vehiclePlate?: string;
      vehicleModel?: string;
      vehicleColor?: string;
      estimatedArrival: number;
      driverLocation: {
        latitude: number;
        longitude: number;
      };
    }
  ): void {
    notifyDriverFound(this.roomManager, riderId, orderId, driverData);
  }

  // Send driver location to rider
  sendDriverLocation(
    orderId: number,
    location: { latitude: number; longitude: number }
  ): void {
    sendDriverLocationToRider(this.roomManager, orderId, location);
  }

  // Update order status
  updateOrderStatus(
    orderId: number,
    status: string,
    message?: string
  ): void {
    this.roomManager.emitToOrder(orderId, 'order:status', {
      orderId,
      status,
      message,
    });
  }

  // Send system message to order participants
  sendSystemMessage(orderId: number, content: string): void {
    sendSystemMessage(this.roomManager, orderId, content);
  }

  // Get online drivers count
  getOnlineDriversCount(): number {
    return DriverTracker.getAllOnline().length;
  }

  // Get nearby drivers for an order
  getNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusKm: number,
    serviceId?: number
  ) {
    return DriverTracker.getNearbyDrivers(latitude, longitude, radiusKm, serviceId);
  }

  // Check if driver is online
  isDriverOnline(driverId: number): boolean {
    return DriverTracker.isOnline(driverId);
  }

  // Get driver location
  getDriverLocation(driverId: number) {
    const driver = DriverTracker.getDriver(driverId);
    return driver?.location;
  }
}
