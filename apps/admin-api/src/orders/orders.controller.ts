import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderStatus } from 'database';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: OrderStatus,
    @Query('customerId') customerId?: string,
    @Query('driverId') driverId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.findAll(
      +page,
      +limit,
      status,
      customerId ? +customerId : undefined,
      driverId ? +driverId : undefined,
      serviceId ? +serviceId : undefined,
      startDate,
      endDate,
    );
  }

  @Get('stats')
  getStats() {
    return this.ordersService.getStats();
  }

  @Get('cancel-reasons')
  getCancelReasons() {
    return this.ordersService.getCancelReasons();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    customerId: number;
    serviceId: number;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress?: string;
    dropoffLatitude?: number;
    dropoffLongitude?: number;
    driverId?: number;
    regionId?: number;
    couponCode?: string;
    scheduledAt?: Date;
  }) {
    return this.ordersService.create(body);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: OrderStatus },
  ) {
    return this.ordersService.updateStatus(id, body.status);
  }

  @Patch(':id/assign')
  assignDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { driverId: number },
  ) {
    return this.ordersService.assignDriver(id, body.driverId);
  }

  @Post(':id/cancel')
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { cancelReasonId?: number; cancelReasonNote?: string },
  ) {
    return this.ordersService.cancelOrder(id, body.cancelReasonId, body.cancelReasonNote);
  }

  // Timeline
  @Get(':id/timeline')
  getTimeline(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getTimeline(id);
  }

  // Messages
  @Get(':id/messages')
  getMessages(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getMessages(id);
  }

  // Notes
  @Get(':id/notes')
  getNotes(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getNotes(id);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    return this.ordersService.addNote(id, req.user.id, note);
  }

  // Refunds
  @Post(':id/refund')
  refundOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount: number; description: string },
  ) {
    return this.ordersService.refundOrder(id, body.amount, body.description);
  }

  // SOS
  @Get(':id/sos')
  getSOSCalls(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getSOSCalls(id);
  }

  @Patch('sos/:sosId')
  updateSOS(
    @Param('sosId', ParseIntPipe) sosId: number,
    @Body() body: { status: string; note?: string },
    @Req() req: any,
  ) {
    return this.ordersService.updateSOS(sosId, req.user.id, body.status, body.note);
  }
}
