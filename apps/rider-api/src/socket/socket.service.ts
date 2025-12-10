import { Injectable } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable()
export class SocketService {
  constructor(private socketGateway: SocketGateway) {}

  // Notify rider about order status change
  notifyOrderStatus(riderId: number, orderId: number, status: string, message?: string) {
    this.socketGateway.emitToRider(riderId, 'order:status', {
      orderId,
      status,
      message,
    });
    this.socketGateway.emitToOrder(orderId, 'order:status', {
      orderId,
      status,
      message,
    });
  }

  // Notify rider that driver was found
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
    },
  ) {
    const data = { orderId, ...driverData };
    this.socketGateway.emitToRider(riderId, 'order:driver_found', data);
    this.socketGateway.emitToOrder(orderId, 'order:driver_found', data);
  }

  // Send driver location to rider
  sendDriverLocation(
    orderId: number,
    location: { latitude: number; longitude: number },
  ) {
    this.socketGateway.emitToOrder(orderId, 'location:driver', {
      orderId,
      location,
    });
  }

  // Notify driver arrived at pickup
  notifyDriverArrived(riderId: number, orderId: number) {
    this.socketGateway.emitToRider(riderId, 'order:driver_arrived', { orderId });
    this.socketGateway.emitToOrder(orderId, 'order:driver_arrived', { orderId });
  }

  // Notify ride started
  notifyRideStarted(riderId: number, orderId: number) {
    this.socketGateway.emitToRider(riderId, 'order:started', {
      orderId,
      startTime: new Date(),
    });
    this.socketGateway.emitToOrder(orderId, 'order:started', {
      orderId,
      startTime: new Date(),
    });
  }

  // Notify ride completed
  notifyRideCompleted(
    riderId: number,
    orderId: number,
    fare: number,
    distance?: number,
    duration?: number,
  ) {
    const data = { orderId, fare, distance, duration };
    this.socketGateway.emitToRider(riderId, 'order:completed', data);
    this.socketGateway.emitToOrder(orderId, 'order:completed', data);
  }

  // Notify order cancelled
  notifyOrderCancelled(
    riderId: number,
    orderId: number,
    cancelledBy: 'rider' | 'driver',
    reason?: string,
  ) {
    const data = { orderId, cancelledBy, reason };
    this.socketGateway.emitToRider(riderId, 'order:cancelled', data);
    this.socketGateway.emitToOrder(orderId, 'order:cancelled', data);
  }

  // Send chat message
  sendChatMessage(orderId: number, message: {
    senderId: number;
    senderType: 'rider' | 'driver';
    content: string;
  }) {
    this.socketGateway.emitToOrder(orderId, 'chat:message', {
      orderId,
      ...message,
      timestamp: new Date(),
    });
  }

  // Check if rider is connected
  isRiderConnected(riderId: number): boolean {
    return this.socketGateway.isRiderConnected(riderId);
  }
}
