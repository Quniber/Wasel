import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface ConnectedClient {
  socketId: string;
  oderId?: number;
  type: 'admin' | 'driver' | 'rider';
  userId: number;
  socket: Socket;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['polling', 'websocket'],
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('SocketGateway');

  // Store connected clients by type
  private admins = new Map<number, ConnectedClient>();
  private drivers = new Map<number, ConnectedClient>();
  private riders = new Map<number, ConnectedClient>();

  // Map socket ID to client info for quick lookup on disconnect
  private socketToClient = new Map<string, { type: string; userId: number }>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      const clientType = client.handshake.auth?.type || client.handshake.query?.type;

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      if (!clientType || !['admin', 'driver', 'rider'].includes(clientType)) {
        this.logger.warn(`Connection rejected: Invalid client type: ${clientType}`);
        client.disconnect();
        return;
      }

      // Verify JWT
      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch (err) {
        this.logger.warn(`Connection rejected: Invalid token`);
        client.disconnect();
        return;
      }

      const userId = payload.sub || payload.id;
      if (!userId) {
        this.logger.warn(`Connection rejected: No user ID in token`);
        client.disconnect();
        return;
      }

      const connectedClient: ConnectedClient = {
        socketId: client.id,
        type: clientType,
        userId: Number(userId),
        socket: client,
      };

      // Store client in appropriate map
      switch (clientType) {
        case 'admin':
          this.admins.set(userId, connectedClient);
          client.join('admins');
          this.logger.log(`Admin ${userId} connected (socket: ${client.id})`);
          break;
        case 'driver':
          this.drivers.set(userId, connectedClient);
          client.join('drivers');
          this.logger.log(`Driver ${userId} connected (socket: ${client.id})`);
          break;
        case 'rider':
          this.riders.set(userId, connectedClient);
          client.join('riders');
          this.logger.log(`Rider ${userId} connected (socket: ${client.id})`);
          break;
      }

      // Store mapping for disconnect
      this.socketToClient.set(client.id, { type: clientType, userId });

      // Send connection confirmation
      client.emit('connected', { userId, type: clientType });

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.socketToClient.get(client.id);
    if (clientInfo) {
      const { type, userId } = clientInfo;

      switch (type) {
        case 'admin':
          this.admins.delete(userId);
          this.logger.log(`Admin ${userId} disconnected`);
          break;
        case 'driver':
          this.drivers.delete(userId);
          this.logger.log(`Driver ${userId} disconnected`);
          // Notify admins about driver going offline
          this.emitToAdmins('driver:status', { driverId: userId, status: 'offline' });
          break;
        case 'rider':
          this.riders.delete(userId);
          this.logger.log(`Rider ${userId} disconnected`);
          break;
      }

      this.socketToClient.delete(client.id);
    }
  }

  // ========== Driver Events ==========

  @SubscribeMessage('driver:online')
  handleDriverOnline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { services?: number[] },
  ) {
    const clientInfo = this.socketToClient.get(client.id);
    if (clientInfo?.type === 'driver') {
      this.logger.log(`Driver ${clientInfo.userId} is now online with services: ${data?.services?.join(', ') || 'all'}`);
      // Notify admins
      this.emitToAdmins('driver:status', {
        driverId: clientInfo.userId,
        status: 'online',
        services: data?.services,
      });
    }
  }

  @SubscribeMessage('driver:offline')
  handleDriverOffline(@ConnectedSocket() client: Socket) {
    const clientInfo = this.socketToClient.get(client.id);
    if (clientInfo?.type === 'driver') {
      this.logger.log(`Driver ${clientInfo.userId} is now offline`);
      this.emitToAdmins('driver:status', { driverId: clientInfo.userId, status: 'offline' });
    }
  }

  @SubscribeMessage('driver:location')
  handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { latitude: number; longitude: number; heading?: number },
  ) {
    const clientInfo = this.socketToClient.get(client.id);
    if (clientInfo?.type === 'driver') {
      // Get the driver's current order if any
      const driver = this.drivers.get(clientInfo.userId);
      if (driver?.oderId) {
        // Send location update to the rider of this order
        this.emitToOrder(driver.oderId, 'driver:location', {
          driverId: clientInfo.userId,
          ...data,
        });
      }
      // Also notify admins watching this driver
      this.emitToAdmins('driver:location', {
        driverId: clientInfo.userId,
        ...data,
      });
    }
  }

  @SubscribeMessage('order:accept')
  handleOrderAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    const clientInfo = this.socketToClient.get(client.id);
    if (clientInfo?.type === 'driver') {
      const driver = this.drivers.get(clientInfo.userId);
      if (driver) {
        driver.oderId = data.orderId;
      }
      // Join order room
      client.join(`order:${data.orderId}`);
      this.logger.log(`Driver ${clientInfo.userId} accepted order ${data.orderId}`);
    }
  }

  // ========== Rider Events ==========

  @SubscribeMessage('order:track')
  handleOrderTrack(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    const clientInfo = this.socketToClient.get(client.id);
    if (clientInfo?.type === 'rider') {
      client.join(`order:${data.orderId}`);
      this.logger.log(`Rider ${clientInfo.userId} tracking order ${data.orderId}`);
    }
  }

  // ========== Admin Events ==========

  @SubscribeMessage('admin:watch-order')
  handleAdminWatchOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    const clientInfo = this.socketToClient.get(client.id);
    if (clientInfo?.type === 'admin') {
      client.join(`order:${data.orderId}`);
      this.logger.log(`Admin ${clientInfo.userId} watching order ${data.orderId}`);
    }
  }

  // ========== Emit Methods (called by API) ==========

  emitToDriver(driverId: number, event: string, data: any): boolean {
    const driver = this.drivers.get(driverId);
    if (driver) {
      driver.socket.emit(event, data);
      this.logger.log(`Emitted ${event} to driver ${driverId}`);
      return true;
    }
    this.logger.warn(`Driver ${driverId} not connected, cannot emit ${event}`);
    return false;
  }

  emitToRider(riderId: number, event: string, data: any): boolean {
    const rider = this.riders.get(riderId);
    if (rider) {
      rider.socket.emit(event, data);
      this.logger.log(`Emitted ${event} to rider ${riderId}`);
      return true;
    }
    this.logger.warn(`Rider ${riderId} not connected, cannot emit ${event}`);
    return false;
  }

  emitToAdmin(adminId: number, event: string, data: any): boolean {
    const admin = this.admins.get(adminId);
    if (admin) {
      admin.socket.emit(event, data);
      return true;
    }
    return false;
  }

  emitToAdmins(event: string, data: any) {
    this.server.to('admins').emit(event, data);
  }

  emitToDrivers(event: string, data: any) {
    this.server.to('drivers').emit(event, data);
  }

  emitToRiders(event: string, data: any) {
    this.server.to('riders').emit(event, data);
  }

  emitToOrder(orderId: number, event: string, data: any) {
    this.server.to(`order:${orderId}`).emit(event, data);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // ========== Status Methods ==========

  isDriverOnline(driverId: number): boolean {
    return this.drivers.has(driverId);
  }

  isRiderOnline(riderId: number): boolean {
    return this.riders.has(riderId);
  }

  getOnlineDriverIds(): number[] {
    return Array.from(this.drivers.keys());
  }

  getOnlineRiderIds(): number[] {
    return Array.from(this.riders.keys());
  }

  getOnlineAdminIds(): number[] {
    return Array.from(this.admins.keys());
  }

  getStats() {
    return {
      admins: this.admins.size,
      drivers: this.drivers.size,
      riders: this.riders.size,
    };
  }

  // Set order for driver (for location tracking)
  setDriverOrder(driverId: number, orderId: number | null) {
    const driver = this.drivers.get(driverId);
    if (driver) {
      driver.oderId = orderId || undefined;
      if (orderId) {
        driver.socket.join(`order:${orderId}`);
      }
    }
  }
}
