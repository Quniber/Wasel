import { Controller, Post, Get, Patch, Body, UseGuards, Req, Query, Param, BadRequestException } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthGuard } from './customer-auth.guard';

@Controller('customer-auth')
export class CustomerAuthController {
  constructor(private customerAuthService: CustomerAuthService) {}

  @Get('services')
  async getServices() {
    return this.customerAuthService.getServices();
  }

  @Post('login')
  async login(@Body() body: { email?: string; mobileNumber?: string; password: string }) {
    if (!body.password) {
      throw new BadRequestException('Password is required');
    }
    if (!body.email && !body.mobileNumber) {
      throw new BadRequestException('Email or mobile number is required');
    }
    return this.customerAuthService.login((body.email || body.mobileNumber)!, body.password);
  }

  @Post('register')
  async register(
    @Body() body: {
      firstName: string;
      lastName: string;
      mobileNumber: string;
      password: string;
      email?: string;
    },
  ) {
    if (!body.firstName || !body.lastName || !body.mobileNumber || !body.password) {
      throw new BadRequestException('First name, last name, mobile number, and password are required');
    }
    return this.customerAuthService.register(body);
  }

  @Get('profile')
  @UseGuards(CustomerAuthGuard)
  async getProfile(@Req() req: any) {
    return this.customerAuthService.getProfile(req.customer.id);
  }

  @Patch('profile')
  @UseGuards(CustomerAuthGuard)
  async updateProfile(
    @Req() req: any,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ) {
    return this.customerAuthService.updateProfile(req.customer.id, body);
  }

  @Post('request-ride')
  @UseGuards(CustomerAuthGuard)
  async requestRide(
    @Req() req: any,
    @Body() body: {
      serviceId: number;
      pickupAddress: string;
      pickupLatitude: number;
      pickupLongitude: number;
      dropoffAddress: string;
      dropoffLatitude: number;
      dropoffLongitude: number;
    },
  ) {
    if (!body.serviceId || !body.pickupAddress || !body.dropoffAddress) {
      throw new BadRequestException('Service, pickup, and dropoff are required');
    }
    return this.customerAuthService.requestRide(req.customer.id, body);
  }

  @Get('active-order')
  @UseGuards(CustomerAuthGuard)
  async getActiveOrder(@Req() req: any) {
    return this.customerAuthService.getActiveOrder(req.customer.id);
  }

  @Post('orders/:orderId/cancel')
  @UseGuards(CustomerAuthGuard)
  async cancelOrder(
    @Req() req: any,
    @Param('orderId') orderId: string,
  ) {
    return this.customerAuthService.cancelOrder(req.customer.id, parseInt(orderId, 10));
  }

  @Get('orders')
  @UseGuards(CustomerAuthGuard)
  async getOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerAuthService.getOrders(
      req.customer.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
