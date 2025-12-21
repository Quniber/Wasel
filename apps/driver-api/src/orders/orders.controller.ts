import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SocketService } from '../socket/socket.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private socketService: SocketService,
  ) {}

  // Get available orders nearby
  @Get('available')
  getAvailableOrders(@Request() req) {
    return this.ordersService.getAvailableOrders(req.user.id);
  }

  // Get current active order
  @Get('current')
  getCurrentOrder(@Request() req) {
    return this.ordersService.getCurrentOrder(req.user.id);
  }

  // Get order history
  @Get('my')
  getMyOrders(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getMyOrders(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // Get cancel reasons for driver
  @Get('cancel-reasons')
  getCancelReasons() {
    return this.ordersService.getCancelReasons();
  }

  // Get order details
  @Get(':id')
  getOrderDetails(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderDetails(req.user.id, id);
  }

  // Accept an order
  @Post(':id/accept')
  acceptOrder(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.acceptOrder(req.user.id, id);
  }

  // Reject an order (before accepting)
  @Post(':id/reject')
  rejectOrder(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.rejectOrder(req.user.id, id, body.reason);
  }

  // Arrived at pickup location
  @Patch(':id/arrived')
  arrivedAtPickup(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.arrivedAtPickup(req.user.id, id);
  }

  // Start the ride
  @Patch(':id/start')
  startRide(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.startRide(req.user.id, id);
  }

  // Complete the ride
  @Patch(':id/complete')
  completeRide(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.completeRide(req.user.id, id);
  }

  // Cancel the order
  @Patch(':id/cancel')
  cancelOrder(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reasonId?: number },
  ) {
    return this.ordersService.cancelOrder(req.user.id, id, body.reasonId);
  }

  // ========== Chat/Messages ==========

  // Get chat messages for an order
  @Get(':id/messages')
  getMessages(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getMessages(req.user.id, id);
  }

  // Send a message
  @Post(':id/messages')
  sendMessage(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
  ) {
    return this.ordersService.sendMessage(req.user.id, id, body.content);
  }

  // Test endpoint - send a test order to the current driver
  @Post('test/send-order')
  async sendTestOrder(@Request() req) {
    const driverId = req.user.id;

    // Check if driver is online (now async via socket-api)
    const isOnline = await this.socketService.isDriverOnline(driverId);
    if (!isOnline) {
      return { success: false, message: 'Driver is not online' };
    }

    // Send test order
    const testOrder = {
      orderId: 999,
      pickup: {
        address: 'Test Pickup Location, Doha',
        latitude: 25.2854,
        longitude: 51.5310,
      },
      dropoff: {
        address: 'Test Dropoff Location, Doha',
        latitude: 25.3000,
        longitude: 51.5200,
      },
      rider: {
        id: 1,
        firstName: 'Test',
        lastName: 'Customer',
        rating: 4.8,
      },
      estimatedFare: 25.00,
      distance: 5.2,
      duration: 12,
      paymentMethod: 'cash',
      expiresAt: Date.now() + 15000, // 15 seconds
    };

    this.socketService.sendOrderToDriver(driverId, 999, testOrder);

    return {
      success: true,
      message: 'Test order sent to driver',
      order: testOrder
    };
  }

}
