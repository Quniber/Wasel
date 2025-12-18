import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // Get available services
  @Get('services')
  getServices() {
    return this.ordersService.getServices();
  }

  // Get directions between two points (proxy for Google Directions API)
  @Post('directions')
  getDirections(
    @Body()
    body: {
      originLat: number;
      originLng: number;
      destLat: number;
      destLng: number;
    },
  ) {
    return this.ordersService.getDirections(body);
  }

  // Calculate fare estimate
  @Post('calculate')
  calculateFare(
    @Body()
    body: {
      serviceId: number;
      pickupLatitude: number;
      pickupLongitude: number;
      dropoffLatitude: number;
      dropoffLongitude: number;
    },
  ) {
    return this.ordersService.calculateFare(body);
  }

  // Get cancel reasons
  @Get('cancel-reasons')
  getCancelReasons() {
    return this.ordersService.getCancelReasons();
  }

  // Book scheduled ride
  @Post('schedule')
  scheduleRide(
    @Req() req: any,
    @Body()
    body: {
      serviceId: number;
      pickupAddress: string;
      pickupLatitude: number;
      pickupLongitude: number;
      dropoffAddress: string;
      dropoffLatitude: number;
      dropoffLongitude: number;
      scheduledAt: string;
      couponCode?: string;
      paymentMode?: string;
    },
  ) {
    return this.ordersService.scheduleRide(req.user.id, body);
  }

  // Get my scheduled rides
  @Get('scheduled')
  getScheduledRides(@Req() req: any) {
    return this.ordersService.getScheduledRides(req.user.id);
  }

  // Cancel scheduled ride
  @Delete('scheduled/:id')
  cancelScheduledRide(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.cancelScheduledRide(req.user.id, id);
  }

  // Get current active order
  @Get('current')
  getCurrentOrder(@Req() req: any) {
    return this.ordersService.getCurrentOrder(req.user.id);
  }

  // Create new order
  @Post()
  create(
    @Req() req: any,
    @Body()
    body: {
      serviceId: number;
      pickupAddress: string;
      pickupLatitude: number;
      pickupLongitude: number;
      dropoffAddress: string;
      dropoffLatitude: number;
      dropoffLongitude: number;
      couponCode?: string;
      paymentMode?: string;
      scheduledAt?: string;
    },
  ) {
    return this.ordersService.create(req.user.id, body);
  }

  // Get order history
  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ordersService.findAll(
      req.user.id,
      status,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  // Get single order
  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(req.user.id, id);
  }

  // Get order tracking (real-time)
  @Get(':id/track')
  getOrderTracking(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderTracking(req.user.id, id);
  }

  // Cancel order
  @Patch(':id/cancel')
  cancel(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { cancelReasonId?: number; note?: string },
  ) {
    return this.ordersService.cancel(req.user.id, id, body.cancelReasonId, body.note);
  }

  // Rate driver
  @Post(':id/rate')
  rateDriver(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      rating: number;
      review?: string;
      parameters?: Record<string, number>;
    },
  ) {
    return this.ordersService.rateDriver(req.user.id, id, body);
  }

  // Add tip
  @Post(':id/tip')
  addTip(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount: number },
  ) {
    return this.ordersService.addTip(req.user.id, id, body.amount);
  }

  // Get order messages
  @Get(':id/messages')
  getMessages(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getMessages(req.user.id, id);
  }

  // Send message
  @Post(':id/messages')
  sendMessage(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
  ) {
    return this.ordersService.sendMessage(req.user.id, id, body.content);
  }
}
