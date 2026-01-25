// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocketService } from './socket.service';

interface PendingOrder {
  orderId: number;
  nearbyDriverIds: number[];
  currentDriverIndex: number;
  timeout: NodeJS.Timeout | null;
}

@Injectable()
export class DispatchService {
  private logger = new Logger('DispatchService');
  private pendingOrders = new Map<number, PendingOrder>();
  private readonly DRIVER_RESPONSE_TIMEOUT = 15000; // 15 seconds (matches driver app timeout)
  private readonly SEARCH_RADIUS_KM = 10; // 10km radius

  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  /**
   * Find nearby drivers within a specified radius
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusKm: number = this.SEARCH_RADIUS_KM,
  ): Promise<number[]> {
    // Using Haversine formula approximation in SQL
    // 1 degree of latitude ≈ 111km
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(latitude * (Math.PI / 180)));

    const drivers = await this.prisma.driver.findMany({
      where: {
        status: 'online',
        latitude: {
          gte: (latitude - latDelta).toFixed(7),
          lte: (latitude + latDelta).toFixed(7),
        },
        longitude: {
          gte: (longitude - lngDelta).toFixed(7),
          lte: (longitude + lngDelta).toFixed(7),
        },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    });

    // Calculate actual distance and filter
    const nearbyDrivers = drivers
      .map((driver) => ({
        id: driver.id,
        distance: this.calculateDistance(
          latitude,
          longitude,
          Number(driver.latitude) || 0,
          Number(driver.longitude) || 0,
        ),
      }))
      .filter((d) => d.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // Filter to only connected drivers (now async)
    const connectedDriverIds = await this.socketService.getConnectedDriverIds();
    const availableDrivers = nearbyDrivers
      .filter((d) => connectedDriverIds.includes(d.id))
      .map((d) => d.id);

    this.logger.log(
      `Found ${availableDrivers.length} nearby connected drivers within ${radiusKm}km`,
    );

    return availableDrivers;
  }

  /**
   * Dispatch order to a specific driver
   */
  async dispatchToDriver(orderId: number, driverId: number): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            media: { select: { address: true } },
          },
        },
        service: {
          select: { id: true, name: true },
        },
      },
    });

    if (!order) {
      this.logger.error(`Order ${orderId} not found`);
      return false;
    }

    // Check if driver is connected (now async via socket-api)
    const isConnected = await this.socketService.isDriverConnected(driverId);
    if (!isConnected) {
      this.logger.warn(`Driver ${driverId} is not connected, falling back to nearby drivers`);
      return this.dispatchOrder(orderId);
    }

    // Store pending order with only the specific driver
    this.pendingOrders.set(orderId, {
      orderId,
      nearbyDriverIds: [driverId],
      currentDriverIndex: 0,
      timeout: null,
    });

    // Calculate trip distance
    const tripDistance = order.dropoffLatitude && order.dropoffLongitude
      ? this.calculateDistance(
          order.pickupLatitude || 0,
          order.pickupLongitude || 0,
          order.dropoffLatitude,
          order.dropoffLongitude,
        )
      : 0;

    // Send to the specific driver
    await this.sendOrderToNextDriver(orderId, {
      customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
      customerPhoto: order.customer?.media?.address || undefined,
      pickupAddress: order.pickupAddress || '',
      pickupLatitude: order.pickupLatitude || 0,
      pickupLongitude: order.pickupLongitude || 0,
      dropoffAddress: order.dropoffAddress || '',
      dropoffLatitude: order.dropoffLatitude || 0,
      dropoffLongitude: order.dropoffLongitude || 0,
      tripDistance,
      estimatedFare: Number(order.costAfterCoupon) || Number(order.serviceCost) || 0,
      serviceName: order.service?.name || 'Ride',
    });

    this.logger.log(`Dispatched order ${orderId} to specific driver ${driverId}`);
    return true;
  }

  /**
   * Dispatch order to nearby drivers
   */
  async dispatchOrder(orderId: number): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            media: { select: { address: true } },
          },
        },
        service: {
          select: { id: true, name: true },
        },
      },
    });

    if (!order) {
      this.logger.error(`Order ${orderId} not found`);
      return false;
    }

    // Find nearby drivers
    const nearbyDriverIds = await this.findNearbyDrivers(
      Number(order.pickupLatitude) || 0,
      Number(order.pickupLongitude) || 0,
    );

    if (nearbyDriverIds.length === 0) {
      this.logger.warn(`No nearby drivers found for order ${orderId}`);
      return false;
    }

    // Store pending order
    this.pendingOrders.set(orderId, {
      orderId,
      nearbyDriverIds,
      currentDriverIndex: 0,
      timeout: null,
    });

    // Calculate distances
    const distanceToPickup = 0; // Will be calculated per driver
    const tripDistance = order.dropoffLatitude && order.dropoffLongitude
      ? this.calculateDistance(
          order.pickupLatitude || 0,
          order.pickupLongitude || 0,
          order.dropoffLatitude,
          order.dropoffLongitude,
        )
      : 0;

    // Send to first driver
    await this.sendOrderToNextDriver(orderId, {
      customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
      customerPhoto: order.customer?.media?.address || undefined,
      pickupAddress: order.pickupAddress || '',
      pickupLatitude: order.pickupLatitude || 0,
      pickupLongitude: order.pickupLongitude || 0,
      dropoffAddress: order.dropoffAddress || '',
      dropoffLatitude: order.dropoffLatitude || 0,
      dropoffLongitude: order.dropoffLongitude || 0,
      tripDistance,
      estimatedFare: Number(order.costAfterCoupon) || Number(order.serviceCost) || 0,
      serviceName: order.service?.name || 'Ride',
    });

    return true;
  }

  /**
   * Send order to next available driver
   */
  private async sendOrderToNextDriver(
    orderId: number,
    orderData: {
      customerName: string;
      customerPhoto?: string;
      pickupAddress: string;
      pickupLatitude: number;
      pickupLongitude: number;
      dropoffAddress: string;
      dropoffLatitude: number;
      dropoffLongitude: number;
      tripDistance: number;
      estimatedFare: number;
      serviceName: string;
    },
  ): Promise<void> {
    const pending = this.pendingOrders.get(orderId);
    if (!pending) return;

    // Clear any existing timeout
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }

    // Check if we've tried all drivers
    if (pending.currentDriverIndex >= pending.nearbyDriverIds.length) {
      this.logger.warn(`No more drivers available for order ${orderId}`);
      this.pendingOrders.delete(orderId);

      // Check if order was already accepted before marking as NotFound
      const currentOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, driverId: true },
      });

      // Only mark as NotFound if order is still in Requested status
      if (currentOrder && currentOrder.status === 'Requested' && !currentOrder.driverId) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: 'NotFound' },
        });
        this.logger.log(`Order ${orderId} marked as NotFound - no drivers available`);
      } else {
        this.logger.log(`Order ${orderId} already processed (status: ${currentOrder?.status}), skipping NotFound update`);
      }

      // TODO: Notify customer that no drivers are available
      return;
    }

    const driverId = pending.nearbyDriverIds[pending.currentDriverIndex];

    // Get driver's location to calculate distance to pickup
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { latitude: true, longitude: true },
    });

    const distanceToPickup = driver?.latitude && driver?.longitude
      ? this.calculateDistance(
          driver.latitude,
          driver.longitude,
          orderData.pickupLatitude,
          orderData.pickupLongitude,
        )
      : 0;

    // Send order to driver
    this.socketService.sendOrderToDriver(driverId, {
      orderId,
      ...orderData,
      distanceToPickup,
    });

    this.logger.log(
      `Sent order ${orderId} to driver ${driverId} (${pending.currentDriverIndex + 1}/${pending.nearbyDriverIds.length})`,
    );

    // Set timeout for driver response
    pending.timeout = setTimeout(() => {
      this.handleDriverTimeout(orderId);
    }, this.DRIVER_RESPONSE_TIMEOUT);
  }

  /**
   * Handle driver timeout (didn't respond in time)
   */
  handleDriverTimeout(orderId: number): void {
    const pending = this.pendingOrders.get(orderId);
    if (!pending) return;

    const timedOutDriverId = pending.nearbyDriverIds[pending.currentDriverIndex];
    this.logger.log(
      `Driver ${timedOutDriverId} timed out for order ${orderId}`,
    );

    // Move to next driver
    pending.currentDriverIndex++;

    // Get order data and try next driver
    this.prisma.order
      .findUnique({
        where: { id: orderId },
        include: {
          customer: {
            select: { firstName: true, lastName: true, media: { select: { address: true } } },
          },
          service: { select: { name: true } },
        },
      })
      .then((order) => {
        if (order) {
          const tripDistance = order.dropoffLatitude && order.dropoffLongitude
            ? this.calculateDistance(
                order.pickupLatitude || 0,
                order.pickupLongitude || 0,
                order.dropoffLatitude,
                order.dropoffLongitude,
              )
            : 0;

          this.sendOrderToNextDriver(orderId, {
            customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
            customerPhoto: order.customer?.media?.address || undefined,
            pickupAddress: order.pickupAddress || '',
            pickupLatitude: order.pickupLatitude || 0,
            pickupLongitude: order.pickupLongitude || 0,
            dropoffAddress: order.dropoffAddress || '',
            dropoffLatitude: order.dropoffLatitude || 0,
            dropoffLongitude: order.dropoffLongitude || 0,
            tripDistance,
            estimatedFare: Number(order.costAfterCoupon) || Number(order.serviceCost) || 0,
            serviceName: order.service?.name || 'Ride',
          });
        }
      });
  }

  /**
   * Handle driver accepting an order
   */
  handleDriverAccept(orderId: number, driverId: number): void {
    const pending = this.pendingOrders.get(orderId);
    if (pending) {
      // Clear timeout
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      // Remove from pending
      this.pendingOrders.delete(orderId);
      this.logger.log(`Order ${orderId} accepted by driver ${driverId}`);
    }
  }

  /**
   * Handle driver rejecting an order
   */
  handleDriverReject(orderId: number, driverId: number): void {
    const pending = this.pendingOrders.get(orderId);
    if (pending) {
      // Clear timeout and move to next driver
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      this.handleDriverTimeout(orderId);
    }
  }

  /**
   * Cancel dispatch for an order
   */
  cancelDispatch(orderId: number): void {
    const pending = this.pendingOrders.get(orderId);
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }

      // Notify all drivers who received the order request
      for (let i = 0; i <= pending.currentDriverIndex && i < pending.nearbyDriverIds.length; i++) {
        const driverId = pending.nearbyDriverIds[i];
        this.socketService.notifyDriverOrderCancelled(driverId, orderId, 'Order cancelled by rider');
        this.logger.log(`Notified driver ${driverId} that order ${orderId} was cancelled`);
      }

      this.pendingOrders.delete(orderId);
      this.logger.log(`Dispatch cancelled for order ${orderId}`);
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
