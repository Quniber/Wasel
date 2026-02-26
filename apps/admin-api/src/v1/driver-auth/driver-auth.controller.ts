import { Controller, Post, Get, Patch, Body, UseGuards, Req, Query, BadRequestException } from '@nestjs/common';
import { DriverAuthService } from './driver-auth.service';
import { DriverAuthGuard } from './driver-auth.guard';

@Controller({ path: 'driver-auth', version: '1' })
export class DriverAuthController {
  constructor(private driverAuthService: DriverAuthService) {}

  @Post('login')
  async login(@Body() body: { email?: string; mobileNumber?: string; password: string }) {
    if (!body.password) {
      throw new BadRequestException('Password is required');
    }
    if (!body.email && !body.mobileNumber) {
      throw new BadRequestException('Email or mobile number is required');
    }
    return this.driverAuthService.login((body.email || body.mobileNumber)!, body.password);
  }

  @Post('register')
  async register(
    @Body() body: {
      firstName: string;
      lastName: string;
      mobileNumber: string;
      password: string;
      email?: string;
      carPlate?: string;
    },
  ) {
    if (!body.firstName || !body.lastName || !body.mobileNumber || !body.password) {
      throw new BadRequestException('First name, last name, mobile number, and password are required');
    }
    return this.driverAuthService.register(body);
  }

  @Get('profile')
  @UseGuards(DriverAuthGuard)
  async getProfile(@Req() req: any) {
    return this.driverAuthService.getProfile(req.driver.id);
  }

  @Patch('profile')
  @UseGuards(DriverAuthGuard)
  async updateProfile(
    @Req() req: any,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      carPlate?: string;
    },
  ) {
    return this.driverAuthService.updateProfile(req.driver.id, body);
  }

  @Post('location')
  @UseGuards(DriverAuthGuard)
  async updateLocation(
    @Req() req: any,
    @Body() body: { latitude: number; longitude: number },
  ) {
    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      throw new BadRequestException('Latitude and longitude are required');
    }
    return this.driverAuthService.updateLocation(req.driver.id, body.latitude, body.longitude);
  }

  @Post('status')
  @UseGuards(DriverAuthGuard)
  async setOnlineStatus(
    @Req() req: any,
    @Body() body: { isOnline: boolean },
  ) {
    if (typeof body.isOnline !== 'boolean') {
      throw new BadRequestException('isOnline must be a boolean');
    }
    return this.driverAuthService.setOnlineStatus(req.driver.id, body.isOnline);
  }

  @Get('orders')
  @UseGuards(DriverAuthGuard)
  async getOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.driverAuthService.getOrders(
      req.driver.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
