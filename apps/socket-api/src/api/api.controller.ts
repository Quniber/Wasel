import { Controller, Post, Get, Body, Param, ParseIntPipe } from '@nestjs/common';
import { SocketService } from '../socket/socket.service';

@Controller()
export class ApiController {
  constructor(private socketService: SocketService) {}

  // ========== Status Endpoints ==========

  @Get('status')
  getStatus() {
    return {
      success: true,
      stats: this.socketService.getStats(),
    };
  }

  @Get('drivers/online')
  getOnlineDrivers() {
    return {
      success: true,
      drivers: this.socketService.getOnlineDriverIds(),
    };
  }

  @Get('drivers/:id/online')
  isDriverOnline(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      online: this.socketService.isDriverOnline(id),
    };
  }

  @Get('riders/online')
  getOnlineRiders() {
    return {
      success: true,
      riders: this.socketService.getOnlineRiderIds(),
    };
  }

  @Get('riders/:id/online')
  isRiderOnline(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      online: this.socketService.isRiderOnline(id),
    };
  }

  // ========== Emit Endpoints ==========

  @Post('emit/driver/:id')
  emitToDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { event: string; data: any },
  ) {
    const sent = this.socketService.emitToDriver(id, body.event, body.data);
    return { success: sent, message: sent ? 'Event sent' : 'Driver not online' };
  }

  @Post('emit/rider/:id')
  emitToRider(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { event: string; data: any },
  ) {
    const sent = this.socketService.emitToRider(id, body.event, body.data);
    return { success: sent, message: sent ? 'Event sent' : 'Rider not online' };
  }

  @Post('emit/admin/:id')
  emitToAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { event: string; data: any },
  ) {
    const sent = this.socketService.emitToAdmin(id, body.event, body.data);
    return { success: sent, message: sent ? 'Event sent' : 'Admin not online' };
  }

  @Post('emit/admins')
  emitToAdmins(@Body() body: { event: string; data: any }) {
    this.socketService.emitToAdmins(body.event, body.data);
    return { success: true, message: 'Event broadcasted to admins' };
  }

  @Post('emit/drivers')
  emitToDrivers(@Body() body: { event: string; data: any }) {
    this.socketService.emitToDrivers(body.event, body.data);
    return { success: true, message: 'Event broadcasted to drivers' };
  }

  @Post('emit/riders')
  emitToRiders(@Body() body: { event: string; data: any }) {
    this.socketService.emitToRiders(body.event, body.data);
    return { success: true, message: 'Event broadcasted to riders' };
  }

  @Post('emit/order/:id')
  emitToOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { event: string; data: any },
  ) {
    this.socketService.emitToOrder(id, body.event, body.data);
    return { success: true, message: 'Event sent to order room' };
  }

  @Post('emit/all')
  emitToAll(@Body() body: { event: string; data: any }) {
    this.socketService.emitToAll(body.event, body.data);
    return { success: true, message: 'Event broadcasted to all' };
  }

  // ========== Order Dispatch ==========

  @Post('dispatch/order')
  dispatchOrder(
    @Body() body: {
      driverId: number;
      orderId: number;
      pickup: { address: string; latitude: number; longitude: number };
      dropoff: { address: string; latitude: number; longitude: number };
      customer: { id: number; firstName: string; lastName: string; rating?: number };
      estimatedFare: number;
      distance: number;
      duration: number;
      serviceName: string;
    },
  ) {
    const { driverId, orderId, pickup, dropoff, customer, estimatedFare, distance, duration, serviceName } = body;

    // Check if driver is online
    if (!this.socketService.isDriverOnline(driverId)) {
      return { success: false, message: 'Driver is not online' };
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

    // Send to driver
    this.socketService.emitToDriver(driverId, 'order:new', orderPayload);

    return {
      success: true,
      message: 'Order dispatched to driver',
      driverId,
      orderId,
    };
  }

  // ========== Driver Order Assignment ==========

  @Post('drivers/:id/order')
  setDriverOrder(
    @Param('id', ParseIntPipe) driverId: number,
    @Body() body: { orderId: number | null },
  ) {
    this.socketService.setDriverOrder(driverId, body.orderId);
    return { success: true };
  }

  // ========== Order Status Updates ==========

  @Post('orders/:id/status')
  updateOrderStatus(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body: { status: string; driverId?: number; riderId?: number; data?: any },
  ) {
    const { status, driverId, riderId, data } = body;

    // Emit to order room (all participants)
    this.socketService.emitToOrder(orderId, 'order:status', {
      orderId,
      status,
      ...data,
    });

    // Also emit to admins
    this.socketService.emitToAdmins('order:status', {
      orderId,
      status,
      driverId,
      riderId,
      ...data,
    });

    return { success: true, message: 'Status update sent' };
  }

  // ========== Dashboard Updates ==========

  @Post('dashboard/update')
  dashboardUpdate(@Body() body: any) {
    this.socketService.emitToAdmins('dashboard:update', body);
    return { success: true };
  }

  // ========== Notifications ==========

  @Post('notify/driver/:id')
  notifyDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string; message: string; type?: string },
  ) {
    const sent = this.socketService.emitToDriver(id, 'notification', body);
    return { success: sent };
  }

  @Post('notify/rider/:id')
  notifyRider(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string; message: string; type?: string },
  ) {
    const sent = this.socketService.emitToRider(id, 'notification', body);
    return { success: sent };
  }
}
