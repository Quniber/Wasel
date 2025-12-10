import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomerStatus, TransactionType, AddressType, Gender } from 'database';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('status') status?: CustomerStatus,
  ) {
    return this.customersService.findAll(+page, +limit, search, status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobileNumber: string;
    countryIso?: string;
    gender?: Gender;
  }) {
    return this.customersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      mobileNumber?: string;
      status?: CustomerStatus;
      countryIso?: string;
      gender?: Gender;
    },
  ) {
    return this.customersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }

  // Addresses
  @Get(':id/addresses')
  getAddresses(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getAddresses(id);
  }

  @Post(':id/addresses')
  addAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      type?: AddressType;
      title?: string;
      address: string;
      latitude: number;
      longitude: number;
      isDefault?: boolean;
    },
  ) {
    return this.customersService.addAddress(id, body);
  }

  @Patch('addresses/:addressId')
  updateAddress(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() body: {
      type?: AddressType;
      title?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      isDefault?: boolean;
    },
  ) {
    return this.customersService.updateAddress(addressId, body);
  }

  @Delete('addresses/:addressId')
  removeAddress(@Param('addressId', ParseIntPipe) addressId: number) {
    return this.customersService.removeAddress(addressId);
  }

  // Wallet
  @Get(':id/wallet')
  getWallet(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getWallet(id);
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
    return this.customersService.adjustWallet(id, body.amount, body.type, body.description);
  }

  // Orders
  @Get(':id/orders')
  getOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.customersService.getOrders(id, +page, +limit);
  }

  // Stats
  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getStats(id);
  }

  // Notes
  @Get(':id/notes')
  getNotes(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getNotes(id);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    return this.customersService.addNote(id, req.user.id, note);
  }

  // Favorite Drivers
  @Get(':id/favorite-drivers')
  getFavoriteDrivers(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getFavoriteDrivers(id);
  }

  @Delete(':id/favorite-drivers/:driverId')
  removeFavoriteDriver(
    @Param('id', ParseIntPipe) id: number,
    @Param('driverId', ParseIntPipe) driverId: number,
  ) {
    return this.customersService.removeFavoriteDriver(id, driverId);
  }

  // Blocked Drivers
  @Get(':id/blocked-drivers')
  getBlockedDrivers(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getBlockedDrivers(id);
  }

  @Delete(':id/blocked-drivers/:driverId')
  removeBlockedDriver(
    @Param('id', ParseIntPipe) id: number,
    @Param('driverId', ParseIntPipe) driverId: number,
  ) {
    return this.customersService.removeBlockedDriver(id, driverId);
  }

  // Coupons
  @Get(':id/coupons')
  getCoupons(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getCoupons(id);
  }
}
