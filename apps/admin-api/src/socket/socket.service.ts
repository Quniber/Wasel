import { Injectable } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable()
export class SocketService {
  constructor(private socketGateway: SocketGateway) {}

  // Dashboard updates
  broadcastDashboardUpdate(data: {
    onlineDrivers?: number;
    activeOrders?: number;
    todayOrders?: number;
    todayRevenue?: number;
  }) {
    this.socketGateway.emitToDashboard('dashboard:update', data);
  }

  // New order created
  notifyNewOrder(order: {
    id: number;
    status: string;
    customerName: string;
    pickupAddress: string;
    dropoffAddress: string;
    serviceName: string;
    createdAt: Date;
  }) {
    this.socketGateway.emitToDashboard('order:new', order);
    this.socketGateway.emitToAllAdmins('order:new', order);
  }

  // Order status changed
  notifyOrderStatusChange(orderId: number, status: string, data?: any) {
    this.socketGateway.emitToOrder(orderId, 'order:status', {
      orderId,
      status,
      ...data,
    });
    this.socketGateway.emitToDashboard('order:status', {
      orderId,
      status,
      ...data,
    });
  }

  // Driver status change (online/offline)
  notifyDriverStatusChange(driverId: number, status: 'online' | 'offline', driverName?: string) {
    this.socketGateway.emitToDashboard('driver:status', {
      driverId,
      status,
      driverName,
    });
  }

  // New customer registered
  notifyNewCustomer(customer: {
    id: number;
    firstName: string;
    lastName: string;
    createdAt: Date;
  }) {
    this.socketGateway.emitToDashboard('customer:new', customer);
  }

  // New driver registered
  notifyNewDriver(driver: {
    id: number;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: Date;
  }) {
    this.socketGateway.emitToDashboard('driver:new', driver);
  }

  // Support request created
  notifySupportRequest(request: {
    id: number;
    subject: string;
    customerName?: string;
    driverName?: string;
    createdAt: Date;
  }) {
    this.socketGateway.emitToAllAdmins('support:new', request);
  }

  // Alert/notification to admins
  sendAlert(alert: {
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
  }) {
    this.socketGateway.emitToAllAdmins('alert', alert);
  }

  // Get connected admins count
  getConnectedAdminsCount(): number {
    return this.socketGateway.getConnectedAdminsCount();
  }

  // ============ DRIVER METHODS ============

  // Send order request to specific driver
  sendOrderToDriver(driverId: number, order: {
    orderId: number;
    customerName: string;
    customerPhoto?: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    distanceToPickup: number;
    tripDistance: number;
    estimatedFare: number;
    serviceName: string;
  }) {
    this.socketGateway.emitToDriver(driverId, 'order:new', order);
  }

  // Notify driver that order was cancelled
  notifyDriverOrderCancelled(driverId: number, orderId: number, reason?: string) {
    this.socketGateway.emitToDriver(driverId, 'order:cancelled', {
      orderId,
      reason: reason || 'Order was cancelled',
    });
  }

  // Get connected drivers count
  getConnectedDriversCount(): number {
    return this.socketGateway.getConnectedDriversCount();
  }

  // Get list of connected driver IDs
  getConnectedDriverIds(): number[] {
    return this.socketGateway.getConnectedDriverIds();
  }

  // Check if driver is connected
  isDriverConnected(driverId: number): boolean {
    return this.socketGateway.isDriverConnected(driverId);
  }

  // Broadcast to all online drivers
  broadcastToOnlineDrivers(event: string, data: any) {
    this.socketGateway.emitToOnlineDrivers(event, data);
  }
}
