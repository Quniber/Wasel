import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface DriverLocation {
  latitude: number;
  longitude: number;
}

interface OnlineDriver {
  driverId: number;
  socketId: string;
  location: DriverLocation;
  serviceIds: number[];
  lastUpdate: Date;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: number;
      type: 'driver';
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('DriverSocketGateway');
  private onlineDrivers = new Map<number, OnlineDriver>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Driver WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'taxi-secret-key',
      });

      if (payload.type !== 'driver') {
        this.logger.warn(`Connection rejected: Not a driver token`);
        client.disconnect();
        return;
      }

      client.data.user = {
        id: payload.sub,
        type: 'driver',
      };

      // Join driver-specific room
      client.join(`driver:${payload.sub}`);

      this.logger.log(`Driver ${payload.sub} connected (socket: ${client.id})`);

      client.emit('connected', {
        userId: payload.sub,
        userType: 'driver',
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data?.user;
    if (user) {
      this.onlineDrivers.delete(user.id);

      // Update status in database
      try {
        await this.prisma.driver.update({
          where: { id: user.id },
          data: {
            status: 'offline',
            lastSeenAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`Failed to update driver ${user.id} status on disconnect: ${error.message}`);
      }

      this.logger.log(`Driver ${user.id} disconnected`);
    }
  }

  // Driver goes online
  @SubscribeMessage('driver:online')
  async handleDriverOnline(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { serviceIds?: number[]; location?: DriverLocation },
  ) {
    const serviceIds = data?.serviceIds || [];
    const location = data?.location;
    const driverId = client.data.user.id;

    this.onlineDrivers.set(driverId, {
      driverId,
      socketId: client.id,
      location: location || { latitude: 0, longitude: 0 },
      serviceIds,
      lastUpdate: new Date(),
    });

    // Join service-specific rooms
    serviceIds.forEach((serviceId) => {
      client.join(`service:${serviceId}`);
    });

    // Update status in database
    try {
      const updateData: any = {
        status: 'online',
        lastSeenAt: new Date(),
      };
      if (location) {
        updateData.latitude = location.latitude;
        updateData.longitude = location.longitude;
      }
      await this.prisma.driver.update({
        where: { id: driverId },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(`Failed to update driver ${driverId} status: ${error.message}`);
    }

    this.logger.log(`Driver ${driverId} is now online with services: ${serviceIds.join(', ')}`);
    return { success: true };
  }

  // Driver goes offline
  @SubscribeMessage('driver:offline')
  async handleDriverOffline(@ConnectedSocket() client: AuthenticatedSocket) {
    const driverId = client.data.user.id;
    const driver = this.onlineDrivers.get(driverId);

    if (driver) {
      driver.serviceIds.forEach((serviceId) => {
        client.leave(`service:${serviceId}`);
      });
    }

    this.onlineDrivers.delete(driverId);

    // Update status in database
    try {
      await this.prisma.driver.update({
        where: { id: driverId },
        data: {
          status: 'offline',
          lastSeenAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update driver ${driverId} status: ${error.message}`);
    }

    this.logger.log(`Driver ${driverId} is now offline`);
    return { success: true };
  }

  // Driver location update
  @SubscribeMessage('driver:location')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() location: DriverLocation,
  ) {
    const driverId = client.data.user.id;
    const driver = this.onlineDrivers.get(driverId);

    if (driver) {
      driver.location = location;
      driver.lastUpdate = new Date();
    }

    // Save location to database for admin panel to see
    try {
      await this.prisma.driver.update({
        where: { id: driverId },
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          lastSeenAt: new Date(),
        },
      });

      // Broadcast to admin dashboard for real-time map updates
      this.server.to('admin:dashboard').emit('driver:location:update', {
        driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to save location for driver ${driverId}: ${error.message}`);
    }

    return { success: true };
  }

  // Admin subscribes to dashboard updates
  @SubscribeMessage('admin:subscribe')
  handleAdminSubscribe(@ConnectedSocket() client: Socket) {
    client.join('admin:dashboard');
    this.logger.log(`Admin subscribed to dashboard updates`);
    return { success: true, onlineDrivers: this.getOnlineDrivers() };
  }

  // Driver accepts order
  @SubscribeMessage('driver:accept')
  handleAcceptOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    const { orderId } = data;
    const driverId = client.data.user.id;

    // Join order room
    client.join(`order:${orderId}`);

    // Notify order room
    this.server.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'DriverAccepted',
      driverId,
      message: 'Driver has accepted your ride request',
    });

    this.logger.log(`Driver ${driverId} accepted order ${orderId}`);
    return { success: true };
  }

  // Driver rejects order
  @SubscribeMessage('driver:reject')
  handleRejectOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number; reason?: string },
  ) {
    const { orderId, reason } = data;
    const driverId = client.data.user.id;

    this.logger.log(`Driver ${driverId} rejected order ${orderId}: ${reason || 'No reason'}`);
    return { success: true };
  }

  // Driver arrived at pickup
  @SubscribeMessage('driver:arrived')
  handleArrived(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    const { orderId } = data;

    this.server.to(`order:${orderId}`).emit('order:driver_arrived', { orderId });
    this.server.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'Arrived',
      message: 'Driver has arrived at pickup location',
    });

    this.logger.log(`Driver ${client.data.user.id} arrived at pickup for order ${orderId}`);
    return { success: true };
  }

  // Driver starts ride
  @SubscribeMessage('driver:start')
  handleStartRide(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    const { orderId } = data;

    this.server.to(`order:${orderId}`).emit('order:started', {
      orderId,
      startTime: new Date(),
    });
    this.server.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'Started',
      message: 'Ride has started',
    });

    this.logger.log(`Driver ${client.data.user.id} started ride for order ${orderId}`);
    return { success: true };
  }

  // Driver completes ride
  @SubscribeMessage('driver:complete')
  handleCompleteRide(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number; fare: number; distance?: number; duration?: number },
  ) {
    const { orderId, fare, distance, duration } = data;

    this.server.to(`order:${orderId}`).emit('order:completed', {
      orderId,
      fare,
      distance,
      duration,
    });
    this.server.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'Finished',
      message: 'Ride completed',
    });

    // Leave order room
    client.leave(`order:${orderId}`);

    this.logger.log(`Driver ${client.data.user.id} completed order ${orderId}`);
    return { success: true };
  }

  // Driver cancels order
  @SubscribeMessage('driver:cancel')
  handleCancelOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number; reasonId?: number },
  ) {
    const { orderId, reasonId } = data;

    this.server.to(`order:${orderId}`).emit('order:cancelled', {
      orderId,
      cancelledBy: 'driver',
      reasonId,
    });
    this.server.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'DriverCanceled',
      message: 'Driver has cancelled the ride',
    });

    client.leave(`order:${orderId}`);

    this.logger.log(`Driver ${client.data.user.id} cancelled order ${orderId}`);
    return { success: true };
  }

  // Send chat message
  @SubscribeMessage('chat:send')
  handleChatSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number; content: string },
  ) {
    const { orderId, content } = data;
    const user = client.data.user;

    this.server.to(`order:${orderId}`).emit('chat:message', {
      orderId,
      senderId: user.id,
      senderType: 'driver',
      content,
      timestamp: new Date(),
    });

    this.logger.log(`Chat message in order ${orderId} from driver ${user.id}`);
    return { success: true };
  }

  // Typing indicator
  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    const { orderId } = data;
    const user = client.data.user;

    client.to(`order:${orderId}`).emit('chat:typing', {
      orderId,
      userId: user.id,
      userType: 'driver',
    });
  }

  // Join order room
  @SubscribeMessage('join:order')
  handleJoinOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    client.join(`order:${data.orderId}`);
    this.logger.log(`Driver ${client.data.user.id} joined order room ${data.orderId}`);
    return { success: true };
  }

  // Helper methods
  emitToDriver(driverId: number, event: string, data: any) {
    this.server.to(`driver:${driverId}`).emit(event, data);
  }

  emitToOrder(orderId: number, event: string, data: any) {
    this.server.to(`order:${orderId}`).emit(event, data);
  }

  emitToService(serviceId: number, event: string, data: any) {
    this.server.to(`service:${serviceId}`).emit(event, data);
  }

  getOnlineDrivers(): OnlineDriver[] {
    return Array.from(this.onlineDrivers.values());
  }

  getNearbyDrivers(lat: number, lng: number, radiusKm: number, serviceId?: number): OnlineDriver[] {
    const drivers = this.getOnlineDrivers();
    return drivers.filter((driver) => {
      const distance = this.calculateDistance(lat, lng, driver.location.latitude, driver.location.longitude);
      const inRadius = distance <= radiusKm;
      const hasService = serviceId ? driver.serviceIds.includes(serviceId) : true;
      return inRadius && hasService;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  isDriverOnline(driverId: number): boolean {
    return this.onlineDrivers.has(driverId);
  }

  getDriverLocation(driverId: number): DriverLocation | undefined {
    return this.onlineDrivers.get(driverId)?.location;
  }
}
