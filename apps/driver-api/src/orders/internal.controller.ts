import { Controller, Post, Body, Logger } from '@nestjs/common';
import { SocketService } from '../socket/socket.service';

@Controller('orders/internal')
export class InternalController {
  private readonly logger = new Logger('InternalController');

  constructor(private socketService: SocketService) {}

  // Internal endpoint - dispatch order to driver (called from admin-api)
  // No auth required - internal service communication
  // Note: With centralized socket-api, admin-api can call socket-api directly
  // This endpoint is kept for backward compatibility
  @Post('dispatch')
  async dispatchOrderToDriver(@Body() body: {
    driverId: number;
    orderId: number;
    pickup: { address: string; latitude: number; longitude: number };
    dropoff: { address: string; latitude: number; longitude: number };
    customer: { id: number; firstName: string; lastName: string; rating?: number };
    estimatedFare: number;
    distance: number;
    duration: number;
    serviceName: string;
  }) {
    const { driverId, orderId, pickup, dropoff, customer, estimatedFare, distance, duration, serviceName } = body;

    this.logger.log(`[Internal] Dispatching order ${orderId} to driver ${driverId}`);

    // Check if driver is online via socket-api
    const isOnline = await this.socketService.isDriverOnline(driverId);
    if (!isOnline) {
      this.logger.log(`[Internal] Driver ${driverId} is not online`);
      return { success: false, message: 'Driver is not online/connected' };
    }

    // Dispatch order via socket-api
    const success = await this.socketService.dispatchOrder(driverId, {
      orderId,
      pickup,
      dropoff,
      customer,
      estimatedFare,
      distance,
      duration,
      serviceName,
    });

    if (success) {
      this.logger.log(`[Internal] Order ${orderId} dispatched to driver ${driverId}`);
      return {
        success: true,
        message: 'Order dispatched to driver',
        driverId,
        orderId
      };
    } else {
      return { success: false, message: 'Failed to dispatch order' };
    }
  }
}
