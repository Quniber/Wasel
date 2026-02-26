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
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: number;
      type: 'rider';
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

  private logger = new Logger('RiderSocketGateway');
  private connectedRiders = new Map<number, string>(); // riderId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Rider WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'taxi-secret-key',
      });

      if (payload.type !== 'rider') {
        this.logger.warn(`Connection rejected: Not a rider token`);
        client.disconnect();
        return;
      }

      // Attach user data to socket
      client.data.user = {
        id: payload.sub,
        type: 'rider',
      };

      // Track connected rider
      this.connectedRiders.set(payload.sub, client.id);

      // Join rider-specific room
      client.join(`rider:${payload.sub}`);

      this.logger.log(`Rider ${payload.sub} connected (socket: ${client.id})`);

      // Send connected confirmation
      client.emit('connected', {
        userId: payload.sub,
        userType: 'rider',
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data?.user;
    if (user) {
      this.connectedRiders.delete(user.id);
      this.logger.log(`Rider ${user.id} disconnected`);
    }
  }

  // Join order room to receive updates
  @SubscribeMessage('join:order')
  handleJoinOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    const { orderId } = data;
    client.join(`order:${orderId}`);
    this.logger.log(`Rider ${client.data.user.id} joined order room ${orderId}`);
    return { success: true };
  }

  // Leave order room
  @SubscribeMessage('leave:order')
  handleLeaveOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number },
  ) {
    const { orderId } = data;
    client.leave(`order:${orderId}`);
    this.logger.log(`Rider ${client.data.user.id} left order room ${orderId}`);
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

    const message = {
      orderId,
      senderId: user.id,
      senderType: 'rider',
      content,
      timestamp: new Date(),
    };

    // Broadcast to order room
    this.server.to(`order:${orderId}`).emit('chat:message', message);

    this.logger.log(`Chat message in order ${orderId} from rider ${user.id}`);
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

    // Broadcast to others in order room
    client.to(`order:${orderId}`).emit('chat:typing', {
      orderId,
      userId: user.id,
      userType: 'rider',
    });
  }

  // Rider location update
  @SubscribeMessage('rider:location')
  handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { latitude: number; longitude: number },
  ) {
    const user = client.data.user;
    this.logger.debug(`Rider ${user.id} location: ${data.latitude}, ${data.longitude}`);
  }

  // Cancel order via socket
  @SubscribeMessage('rider:cancel')
  handleCancel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: number; reasonId?: number },
  ) {
    const { orderId, reasonId } = data;
    const user = client.data.user;

    // Emit to order room
    this.server.to(`order:${orderId}`).emit('order:cancelled', {
      orderId,
      cancelledBy: 'rider',
      reasonId,
    });

    this.server.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'RiderCanceled',
      message: 'Rider has cancelled the ride',
    });

    this.logger.log(`Rider ${user.id} cancelled order ${orderId}`);
  }

  // Helper methods for emitting from services
  emitToRider(riderId: number, event: string, data: any) {
    this.server.to(`rider:${riderId}`).emit(event, data);
  }

  emitToOrder(orderId: number, event: string, data: any) {
    this.server.to(`order:${orderId}`).emit(event, data);
  }

  isRiderConnected(riderId: number): boolean {
    return this.connectedRiders.has(riderId);
  }
}
