import { Injectable } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable()
export class SocketService {
  constructor(private socketGateway: SocketGateway) {}

  // Broadcast new order to nearby drivers
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
    },
  ) {
    // Get nearby drivers for this service
    const nearbyDrivers = this.socketGateway.getNearbyDrivers(
      orderData.pickupLatitude,
      orderData.pickupLongitude,
      10, // 10km radius
      serviceId,
    );

    // Send order to each nearby driver
    nearbyDrivers.forEach((driver) => {
      const distance = this.calculateDistance(
        orderData.pickupLatitude,
        orderData.pickupLongitude,
        driver.location.latitude,
        driver.location.longitude,
      );

      this.socketGateway.emitToDriver(driver.driverId, 'order:new', {
        orderId,
        serviceId,
        distanceToPickup: distance,
        ...orderData,
      });
    });

    return nearbyDrivers.length;
  }

  // Send order directly to specific driver
  sendOrderToDriver(driverId: number, orderId: number, orderData: any) {
    this.socketGateway.emitToDriver(driverId, 'order:new', {
      orderId,
      ...orderData,
    });
  }

  // Notify driver order was cancelled
  notifyOrderCancelled(driverId: number, orderId: number, reason?: string) {
    this.socketGateway.emitToDriver(driverId, 'order:cancelled', {
      orderId,
      cancelledBy: 'rider',
      reason,
    });
  }

  // Notify driver of order timeout
  notifyOrderTimeout(driverId: number, orderId: number) {
    this.socketGateway.emitToDriver(driverId, 'order:timeout', { orderId });
  }

  // Emit to order room
  emitToOrder(orderId: number, event: string, data: any) {
    this.socketGateway.emitToOrder(orderId, event, data);
  }

  // Get nearby drivers
  getNearbyDrivers(lat: number, lng: number, radiusKm: number, serviceId?: number): any[] {
    return this.socketGateway.getNearbyDrivers(lat, lng, radiusKm, serviceId);
  }

  // Get online drivers count
  getOnlineDriversCount(): number {
    return this.socketGateway.getOnlineDrivers().length;
  }

  // Check if driver is online
  isDriverOnline(driverId: number): boolean {
    return this.socketGateway.isDriverOnline(driverId);
  }

  // Get driver location
  getDriverLocation(driverId: number): { latitude: number; longitude: number } | undefined {
    return this.socketGateway.getDriverLocation(driverId);
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
}
