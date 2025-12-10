import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { FleetsService } from './fleets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionType } from 'database';

@Controller('fleets')
@UseGuards(JwtAuthGuard)
export class FleetsController {
  constructor(private fleetsService: FleetsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    return this.fleetsService.findAll(+page, +limit, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fleetsService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    name: string;
    phoneNumber: string;
    mobileNumber: string;
    address?: string;
    accountNumber?: string;
    commissionSharePercent?: number;
    commissionShareFlat?: number;
    userName?: string;
    password?: string;
  }) {
    return this.fleetsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name?: string;
      phoneNumber?: string;
      mobileNumber?: string;
      address?: string;
      accountNumber?: string;
      commissionSharePercent?: number;
      commissionShareFlat?: number;
      feeMultiplier?: number;
      userName?: string;
      password?: string;
      isBlocked?: boolean;
    },
  ) {
    return this.fleetsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fleetsService.remove(id);
  }

  // Drivers
  @Get(':id/drivers')
  getDrivers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.fleetsService.getDrivers(id, +page, +limit);
  }

  @Post(':id/drivers/:driverId')
  addDriver(
    @Param('id', ParseIntPipe) id: number,
    @Param('driverId', ParseIntPipe) driverId: number,
  ) {
    return this.fleetsService.addDriverToFleet(id, driverId);
  }

  @Delete(':id/drivers/:driverId')
  removeDriver(
    @Param('id', ParseIntPipe) id: number,
    @Param('driverId', ParseIntPipe) driverId: number,
  ) {
    return this.fleetsService.removeDriverFromFleet(id, driverId);
  }

  // Orders
  @Get(':id/orders')
  getOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.fleetsService.getOrders(id, +page, +limit);
  }

  // Wallet
  @Get(':id/wallet')
  getWallet(@Param('id', ParseIntPipe) id: number) {
    return this.fleetsService.getWallet(id);
  }

  @Post(':id/wallet/adjust')
  adjustWallet(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      amount: number;
      type: TransactionType;
      description: string;
    },
  ) {
    return this.fleetsService.adjustWallet(id, body.amount, body.type, body.description);
  }

  // Stats
  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.fleetsService.getStats(id);
  }
}
