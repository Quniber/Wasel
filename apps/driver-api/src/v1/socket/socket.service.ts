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

  // Send order directly to specific driver
  sendOrderToDriver(driverId: number, orderId: number, orderData: any) {
    this.callSocketApi(`emit/driver/${driverId}`, {
      event: 'order:new',
      data: { orderId, ...orderData },
    });
  }

  // Notify driver order was cancelled
  notifyOrderCancelled(driverId: number, orderId: number, reason?: string) {
    this.callSocketApi(`emit/driver/${driverId}`, {
      event: 'order:cancelled',
      data: { orderId, cancelledBy: 'rider', reason },
    });
  }

  // Notify driver of order timeout
  notifyOrderTimeout(driverId: number, orderId: number) {
    this.callSocketApi(`emit/driver/${driverId}`, {
      event: 'order:timeout',
      data: { orderId },
    });
  }

  // Emit to order room (rider, driver, admins watching this order)
  emitToOrder(orderId: number, event: string, data: any) {
    this.callSocketApi(`emit/order/${orderId}`, { event, data });
  }

  // Notify rider of order status change
  notifyRider(riderId: number, event: string, data: any) {
    this.callSocketApi(`emit/rider/${riderId}`, { event, data });
  }

  // Notify admins
  notifyAdmins(event: string, data: any) {
    this.callSocketApi('emit/admins', { event, data });
  }

  // Get online drivers count
  async getOnlineDriversCount(): Promise<number> {
    const result = await this.getFromSocketApi('status');
    return result?.stats?.drivers || 0;
  }

  // Get online driver IDs
  async getOnlineDriverIds(): Promise<number[]> {
    const result = await this.getFromSocketApi('drivers/online');
    return result?.drivers || [];
  }

  // Check if driver is online
  async isDriverOnline(driverId: number): Promise<boolean> {
    const result = await this.getFromSocketApi(`drivers/${driverId}/online`);
    return result?.online || false;
  }

  // Set driver's current order (for location tracking)
  setDriverOrder(driverId: number, orderId: number | null) {
    this.callSocketApi(`drivers/${driverId}/order`, { orderId });
  }

  // Dispatch order to driver
  async dispatchOrder(driverId: number, orderData: {
    orderId: number;
    pickup: { address: string; latitude: number; longitude: number };
    dropoff: { address: string; latitude: number; longitude: number };
    customer: { id: number; firstName: string; lastName: string; rating?: number };
    estimatedFare: number;
    distance: number;
    duration: number;
    serviceName: string;
  }): Promise<boolean> {
    const result = await this.callSocketApi('dispatch/order', {
      driverId,
      ...orderData,
    });
    return result?.success || false;
  }
}
