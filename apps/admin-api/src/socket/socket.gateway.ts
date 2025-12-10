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
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchService } from './dispatch.service';
import { OrderStatus } from 'database';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: number;
      type: 'admin' | 'driver';
      email?: string;
      mobileNumber?: string;
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

  private logger = new Logger('SocketGateway');
  private connectedAdmins = new Map<number, string>();
  private connectedDrivers = new Map<number, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => DispatchService))
    private dispatchService: DispatchService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Admin WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`New connection attempt from ${client.id}, IP: ${client.handshake.address}`);
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      this.logger.log(`Token received: ${token ? 'yes (length: ' + token.length + ')' : 'no'}, auth object: ${JSON.stringify(client.handshake.auth || {})}`);

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'taxi-secret-key',
      });

      // Accept both admin and driver tokens
      if (payload.type === 'admin') {
        client.data.user = {
          id: payload.sub,
          type: 'admin',
          email: payload.email,
        };

        this.connectedAdmins.set(payload.sub, client.id);

        // Join admin rooms
        client.join('admin:all');
        client.join(`admin:${payload.sub}`);

        this.logger.log(`Admin ${payload.email} connected (socket: ${client.id})`);

        client.emit('connected', {
          userId: payload.sub,
          userType: 'admin',
        });
      } else if (payload.type === 'driver') {
        client.data.user = {
          id: payload.sub,
          type: 'driver',
          mobileNumber: payload.mobileNumber,
        };

        this.connectedDrivers.set(payload.sub, client.id);

        // Join driver rooms
        client.join('drivers:online');
        client.join(`driver:${payload.sub}`);

        this.logger.log(`Driver ${payload.sub} connected (socket: ${client.id})`);

        client.emit('connected', {
          userId: payload.sub,
          userType: 'driver',
        });

        // Notify admins of driver connection
        this.emitToDashboard('driver:connected', {
          driverId: payload.sub,
          onlineDriversCount: this.connectedDrivers.size,
        });
      } else {
        this.logger.warn(`Connection rejected: Unknown token type ${payload.type}`);
        client.disconnect();
        return;
      }
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data?.user;
    if (user) {
      if (user.type === 'admin') {
        this.connectedAdmins.delete(user.id);
        this.logger.log(`Admin ${user.id} disconnected`);
      } else if (user.type === 'driver') {
        this.connectedDrivers.delete(user.id);
        this.logger.log(`Driver ${user.id} disconnected`);

        // Update driver status to offline in database
        try {
          await this.prisma.driver.update({
            where: { id: user.id },
            data: { status: 'offline' },
          });
          this.logger.log(`Driver ${user.id} status set to offline in database`);
        } catch (error) {
          this.logger.error(`Failed to update driver ${user.id} status: ${error.message}`);
        }

        // Notify admins of driver disconnection
        this.emitToDashboard('driver:disconnected', {
          driverId: user.id,
          onlineDriversCount: this.connectedDrivers.size,
        });
      }
    }
  }

  // Subscribe to live dashboard updates
  @SubscribeMessage('dashboard:subscribe')
  handleDashboardSubscribe(@ConnectedSocket() client: AuthenticatedSocket) {
    client.join('dashboard:live');
    this.logger.log(`Admin ${client.data.user.id} subscribed to dashboard updates`);
    return { success: true };
  }

  // Unsubscribe from live dashboard updates
  @SubscribeMessage('dashboard:unsubscribe')
  handleDashboardUnsubscribe(@ConnectedSocket() client: AuthenticatedSocket) {
    client.leave('dashboard:live');
    this.logger.log(`Admin ${client.data.user.id} unsubscribed from dashboard updates`);
    return { success: true };
  }

  // Subscribe to specific order updates
  @SubscribeMessage('order:subscribe')
  handleOrderSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    client.join(`order:${data.orderId}`);
    this.logger.log(`Admin ${client.data.user.id} subscribed to order ${data.orderId}`);
    return { success: true };
  }

  // Unsubscribe from specific order updates
  @SubscribeMessage('order:unsubscribe')
  handleOrderUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    client.leave(`order:${data.orderId}`);
    return { success: true };
  }

  // ============ DRIVER SOCKET EVENTS ============

  // Driver location update
  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { latitude: number; longitude: number },
  ) {
    if (client.data.user?.type !== 'driver') {
      return { success: false, error: 'Not a driver' };
    }

    const driverId = client.data.user.id;

    try {
      await this.prisma.driver.update({
        where: { id: driverId },
        data: {
          latitude: data.latitude,
          longitude: data.longitude,
        },
      });

      this.logger.log(`Driver ${driverId} location updated: ${data.latitude}, ${data.longitude}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update driver location: ${error.message}`);
      return { success: false, error: 'Failed to update location' };
    }
  }

  // Driver accepts order
  @SubscribeMessage('driver:accept')
  async handleDriverAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    if (client.data.user?.type !== 'driver') {
      return { success: false, error: 'Not a driver' };
    }

    const driverId = client.data.user.id;

    // IMMEDIATELY clear the dispatch timeout to prevent race condition
    // This must happen BEFORE any async operations
    this.dispatchService.handleDriverAccept(data.orderId, driverId);

    try {
      const order = await this.prisma.order.update({
        where: { id: data.orderId },
        data: {
          driverId,
          status: OrderStatus.DriverAccepted,
          acceptedAt: new Date(),
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, mobileNumber: true } },
          service: { select: { id: true, name: true } },
        },
      });

      // Log activity
      await this.prisma.orderActivity.create({
        data: {
          orderId: data.orderId,
          status: OrderStatus.DriverAccepted,
          note: `Driver ${driverId} accepted the order`,
        },
      });

      // Notify admins
      this.emitToDashboard('order:status', {
        orderId: data.orderId,
        status: 'DriverAccepted',
        driverId,
      });

      this.logger.log(`Driver ${driverId} accepted order ${data.orderId}`);
      return { success: true, order };
    } catch (error) {
      this.logger.error(`Failed to accept order: ${error.message}`);
      return { success: false, error: 'Failed to accept order' };
    }
  }

  // Driver arrived at pickup
  @SubscribeMessage('driver:arrived')
  async handleDriverArrived(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    if (client.data.user?.type !== 'driver') {
      return { success: false, error: 'Not a driver' };
    }

    const driverId = client.data.user.id;

    try {
      const order = await this.prisma.order.update({
        where: { id: data.orderId, driverId },
        data: {
          status: OrderStatus.Arrived,
          arrivedAt: new Date(),
        },
      });

      // Log activity
      await this.prisma.orderActivity.create({
        data: {
          orderId: data.orderId,
          status: OrderStatus.Arrived,
        },
      });

      // Notify admins
      this.emitToDashboard('order:status', {
        orderId: data.orderId,
        status: 'Arrived',
        driverId,
      });

      this.logger.log(`Driver ${driverId} arrived at pickup for order ${data.orderId}`);
      return { success: true, order };
    } catch (error) {
      this.logger.error(`Failed to mark arrived: ${error.message}`);
      return { success: false, error: 'Failed to update status' };
    }
  }

  // Driver starts trip
  @SubscribeMessage('driver:start')
  async handleDriverStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    if (client.data.user?.type !== 'driver') {
      return { success: false, error: 'Not a driver' };
    }

    const driverId = client.data.user.id;

    try {
      const order = await this.prisma.order.update({
        where: { id: data.orderId, driverId },
        data: {
          status: OrderStatus.Started,
          startedAt: new Date(),
        },
      });

      // Log activity
      await this.prisma.orderActivity.create({
        data: {
          orderId: data.orderId,
          status: OrderStatus.Started,
        },
      });

      // Notify admins
      this.emitToDashboard('order:status', {
        orderId: data.orderId,
        status: 'Started',
        driverId,
      });

      this.logger.log(`Driver ${driverId} started trip for order ${data.orderId}`);
      return { success: true, order };
    } catch (error) {
      this.logger.error(`Failed to start trip: ${error.message}`);
      return { success: false, error: 'Failed to start trip' };
    }
  }

  // Driver completes trip
  @SubscribeMessage('driver:complete')
  async handleDriverComplete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    if (client.data.user?.type !== 'driver') {
      return { success: false, error: 'Not a driver' };
    }

    const driverId = client.data.user.id;

    try {
      const order = await this.prisma.order.update({
        where: { id: data.orderId, driverId },
        data: {
          status: OrderStatus.WaitingForReview,
          finishedAt: new Date(),
        },
        include: {
          customer: true,
          service: true,
        },
      });

      // Log activity
      await this.prisma.orderActivity.create({
        data: {
          orderId: data.orderId,
          status: OrderStatus.WaitingForReview,
        },
      });

      // Update driver status back to online
      await this.prisma.driver.update({
        where: { id: driverId },
        data: { status: 'online' },
      });

      // Notify admins
      this.emitToDashboard('order:status', {
        orderId: data.orderId,
        status: 'Finished',
        driverId,
      });

      this.logger.log(`Driver ${driverId} completed order ${data.orderId}`);
      return { success: true, order };
    } catch (error) {
      this.logger.error(`Failed to complete trip: ${error.message}`);
      return { success: false, error: 'Failed to complete trip' };
    }
  }

  // Driver rejects/timeout order
  @SubscribeMessage('driver:reject')
  async handleDriverReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number; reason?: string },
  ) {
    if (client.data.user?.type !== 'driver') {
      return { success: false, error: 'Not a driver' };
    }

    const driverId = client.data.user.id;
    this.logger.log(`Driver ${driverId} rejected order ${data.orderId}: ${data.reason || 'timeout'}`);

    // Notify admins
    this.emitToDashboard('order:rejected', {
      orderId: data.orderId,
      driverId,
      reason: data.reason || 'timeout',
    });

    return { success: true };
  }

  // ============ HELPER METHODS ============
  emitToAllAdmins(event: string, data: any) {
    this.server.to('admin:all').emit(event, data);
  }

  emitToDashboard(event: string, data: any) {
    this.server.to('dashboard:live').emit(event, data);
  }

  emitToOrder(orderId: number, event: string, data: any) {
    this.server.to(`order:${orderId}`).emit(event, data);
  }

  emitToAdmin(adminId: number, event: string, data: any) {
    this.server.to(`admin:${adminId}`).emit(event, data);
  }

  getConnectedAdminsCount(): number {
    return this.connectedAdmins.size;
  }

  // Driver helper methods
  emitToDriver(driverId: number, event: string, data: any) {
    this.server.to(`driver:${driverId}`).emit(event, data);
  }

  emitToOnlineDrivers(event: string, data: any) {
    this.server.to('drivers:online').emit(event, data);
  }

  getConnectedDriversCount(): number {
    return this.connectedDrivers.size;
  }

  getConnectedDriverIds(): number[] {
    return Array.from(this.connectedDrivers.keys());
  }

  isDriverConnected(driverId: number): boolean {
    return this.connectedDrivers.has(driverId);
  }
}
