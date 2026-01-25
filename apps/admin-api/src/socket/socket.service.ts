import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SocketService {
  private readonly logger = new Logger('SocketService');
  private readonly socketApiUrl: string;

  constructor(private configService: ConfigService) {
    this.socketApiUrl = this.configService.get('SOCKET_API_URL') || 'http://localhost:3004';
  }

  private async callSocketApi(endpoint: string, data?: any): Promise<any> {
    try {
      const response = await axios.post(`${this.socketApiUrl}/api/${endpoint}`, data);
      return response.data;
    } catch (error) {
      this.logger.error(`Socket API call failed (${endpoint}): ${error.message}`);
      return { success: false };
    }
  }

  private async getFromSocketApi(endpoint: string): Promise<any> {
    try {
      const response = await axios.get(`${this.socketApiUrl}/api/${endpoint}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Socket API call failed (${endpoint}): ${error.message}`);
      return { success: false };
    }
  }

  // Dashboard updates
  broadcastDashboardUpdate(data: {
    onlineDrivers?: number;
    activeOrders?: number;
    todayOrders?: number;
    todayRevenue?: number;
  }) {
    this.callSocketApi('dashboard/update', data);
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
    this.callSocketApi('emit/admins', { event: 'order:new', data: order });
  }

  // Order status changed
  notifyOrderStatusChange(orderId: number, status: string, data?: any) {
    this.callSocketApi(`orders/${orderId}/status`, { status, ...data });
  }

  // Driver status change (online/offline)
  notifyDriverStatusChange(driverId: number, status: 'online' | 'offline', driverName?: string) {
    this.callSocketApi('emit/admins', {
      event: 'driver:status',
      data: { driverId, status, driverName },
    });
  }

  // New customer registered
  notifyNewCustomer(customer: {
    id: number;
    firstName: string;
    lastName: string;
    createdAt: Date;
  }) {
    this.callSocketApi('emit/admins', { event: 'customer:new', data: customer });
  }

  // New driver registered
  notifyNewDriver(driver: {
    id: number;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: Date;
  }) {
    this.callSocketApi('emit/admins', { event: 'driver:new', data: driver });
  }

  // Support request created
  notifySupportRequest(request: {
    id: number;
    subject: string;
    customerName?: string;
    driverName?: string;
    createdAt: Date;
  }) {
    this.callSocketApi('emit/admins', { event: 'support:new', data: request });
  }

  // Alert/notification to admins
  sendAlert(alert: {
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
  }) {
    this.callSocketApi('emit/admins', { event: 'alert', data: alert });
  }

  // Get connected admins count
  async getConnectedAdminsCount(): Promise<number> {
    const result = await this.getFromSocketApi('status');
    return result?.stats?.admins || 0;
  }

  // ============ DRIVER METHODS ============

  // Send order request to specific driver via socket-api
  async sendOrderToDriver(driverId: number, order: {
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
    customerId?: number;
  }) {
    try {
      const response = await this.callSocketApi('dispatch/order', {
        driverId,
        orderId: order.orderId,
        pickup: {
          address: order.pickupAddress,
          latitude: order.pickupLatitude,
          longitude: order.pickupLongitude,
        },
        dropoff: {
          address: order.dropoffAddress,
          latitude: order.dropoffLatitude,
          longitude: order.dropoffLongitude,
        },
        customer: {
          id: order.customerId || 1,
          firstName: order.customerName.split(' ')[0] || 'Customer',
          lastName: order.customerName.split(' ')[1] || '',
        },
        estimatedFare: order.estimatedFare,
        distance: order.tripDistance,
        duration: 0,
        serviceName: order.serviceName,
      });

      this.logger.log(`Order ${order.orderId} dispatched to driver ${driverId}: ${response.success}`);
      return response.success;
    } catch (error) {
      this.logger.error(`Failed to dispatch order: ${error.message}`);
      return false;
    }
  }

  // Notify driver that order was cancelled
  async notifyDriverOrderCancelled(driverId: number, orderId: number, reason?: string) {
    this.logger.log(`[notifyDriverOrderCancelled] Notifying driver ${driverId} about cancelled order ${orderId}`);
    try {
      const result = await this.callSocketApi(`emit/driver/${driverId}`, {
        event: 'order:cancelled',
        data: { orderId, reason: reason || 'Order was cancelled', cancelledBy: 'rider' },
      });
      this.logger.log(`[notifyDriverOrderCancelled] Result for driver ${driverId}, order ${orderId}: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`[notifyDriverOrderCancelled] Error notifying driver ${driverId}: ${error.message}`);
      return { success: false };
    }
  }

  // Notify rider about order update
  notifyRiderOrderUpdate(riderId: number, orderId: number, status: string, data?: any) {
    this.callSocketApi(`emit/rider/${riderId}`, {
      event: 'order:status',
      data: { orderId, status, ...data },
    });
  }

  // Get connected drivers count
  async getConnectedDriversCount(): Promise<number> {
    const result = await this.getFromSocketApi('status');
    return result?.stats?.drivers || 0;
  }

  // Get list of connected driver IDs
  async getConnectedDriverIds(): Promise<number[]> {
    const result = await this.getFromSocketApi('drivers/online');
    return result?.drivers || [];
  }

  // Check if driver is connected
  async isDriverConnected(driverId: number): Promise<boolean> {
    const result = await this.getFromSocketApi(`drivers/${driverId}/online`);
    return result?.online || false;
  }

  // Broadcast to all online drivers
  broadcastToOnlineDrivers(event: string, data: any) {
    this.callSocketApi('emit/drivers', { event, data });
  }

  // Set driver's current order (for location tracking)
  setDriverOrder(driverId: number, orderId: number | null) {
    this.callSocketApi(`drivers/${driverId}/order`, { orderId });
  }
}
