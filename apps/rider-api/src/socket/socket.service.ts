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

  // Notify rider about order status change
  notifyOrderStatus(riderId: number, orderId: number, status: string, message?: string) {
    this.callSocketApi(`emit/rider/${riderId}`, {
      event: 'order:status',
      data: { orderId, status, message },
    });
    this.callSocketApi(`emit/order/${orderId}`, {
      event: 'order:status',
      data: { orderId, status, message },
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
    this.callSocketApi(`emit/rider/${riderId}`, {
      event: 'order:driver_found',
      data,
    });
    this.callSocketApi(`emit/order/${orderId}`, {
      event: 'order:driver_found',
      data,
    });
  }

  // Send driver location to rider
  sendDriverLocation(
    orderId: number,
    location: { latitude: number; longitude: number },
  ) {
    this.callSocketApi(`emit/order/${orderId}`, {
      event: 'location:driver',
      data: { orderId, location },
    });
  }

  // Notify driver arrived at pickup
  notifyDriverArrived(riderId: number, orderId: number) {
    this.callSocketApi(`emit/rider/${riderId}`, {
      event: 'order:driver_arrived',
      data: { orderId },
    });
    this.callSocketApi(`emit/order/${orderId}`, {
      event: 'order:driver_arrived',
      data: { orderId },
    });
  }

  // Notify ride started
  notifyRideStarted(riderId: number, orderId: number) {
    const data = { orderId, startTime: new Date() };
    this.callSocketApi(`emit/rider/${riderId}`, {
      event: 'order:started',
      data,
    });
    this.callSocketApi(`emit/order/${orderId}`, {
      event: 'order:started',
      data,
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
    this.callSocketApi(`emit/rider/${riderId}`, {
      event: 'order:completed',
      data,
    });
    this.callSocketApi(`emit/order/${orderId}`, {
      event: 'order:completed',
      data,
    });
  }

  // Notify order cancelled
  notifyOrderCancelled(
    riderId: number,
    orderId: number,
    cancelledBy: 'rider' | 'driver',
    reason?: string,
  ) {
    const data = { orderId, cancelledBy, reason };
    this.callSocketApi(`emit/rider/${riderId}`, {
      event: 'order:cancelled',
      data,
    });
    this.callSocketApi(`emit/order/${orderId}`, {
      event: 'order:cancelled',
      data,
    });
  }

  // Send chat message
  sendChatMessage(orderId: number, message: {
    senderId: number;
    senderType: 'rider' | 'driver';
    content: string;
  }) {
    this.callSocketApi(`emit/order/${orderId}`, {
      event: 'chat:message',
      data: { orderId, ...message, timestamp: new Date() },
    });
  }

  // Check if rider is connected
  async isRiderConnected(riderId: number): Promise<boolean> {
    const result = await this.getFromSocketApi(`riders/${riderId}/online`);
    return result?.online || false;
  }

  // Notify driver of order update
  notifyDriver(driverId: number, event: string, data: any) {
    this.callSocketApi(`emit/driver/${driverId}`, { event, data });
  }

  // Notify admins
  notifyAdmins(event: string, data: any) {
    this.callSocketApi('emit/admins', { event, data });
  }
}
