import { Controller, Post, Body } from '@nestjs/common';
import { SocketGateway } from '../socket/socket.gateway';

@Controller('orders/internal')
export class InternalController {
  constructor(private socketGateway: SocketGateway) {}

  // Internal endpoint - dispatch order to driver (called from admin-api)
  // No auth required - internal service communication
  @Post('dispatch')
  dispatchOrderToDriver(@Body() body: {
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

    console.log(`[Internal] Dispatching order ${orderId} to driver ${driverId}`);

    // Check if driver is online
    if (!this.socketGateway.isDriverOnline(driverId)) {
      console.log(`[Internal] Driver ${driverId} is not online`);
      return { success: false, message: 'Driver is not online/connected' };
    }

    // Build order payload for driver app
    const orderPayload = {
      orderId,
      pickup,
      dropoff,
      rider: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        rating: customer.rating || 5.0,
      },
      estimatedFare,
      distance,
      duration,
      paymentMethod: 'cash',
      serviceName,
      expiresAt: Date.now() + 15000, // 15 seconds
    };

    console.log(`[Internal] Sending order:new event to driver ${driverId}`);
    this.socketGateway.emitToDriver(driverId, 'order:new', orderPayload);

    return {
      success: true,
      message: 'Order dispatched to driver',
      driverId,
      orderId
    };
  }
}
