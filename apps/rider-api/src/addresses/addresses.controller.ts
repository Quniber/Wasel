import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  // Get all saved addresses
  @Get()
  getAddresses(@Req() req: any) {
    return this.addressesService.getAddresses(req.user.id);
  }

  // Get a single address
  @Get(':id')
  getAddress(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.addressesService.getAddress(req.user.id, id);
  }

  // Create a new address
  @Post()
  createAddress(
    @Req() req: any,
    @Body()
    body: {
      title: string;
      address: string;
      latitude: number;
      longitude: number;
      type?: string;
      details?: string;
      isDefault?: boolean;
    },
  ) {
    return this.addressesService.createAddress(req.user.id, body);
  }

  // Update an address
  @Patch(':id')
  updateAddress(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      title?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      type?: string;
      details?: string;
      isDefault?: boolean;
    },
  ) {
    return this.addressesService.updateAddress(req.user.id, id, body);
  }

  // Delete an address
  @Delete(':id')
  deleteAddress(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.addressesService.deleteAddress(req.user.id, id);
  }

  // Set address as default
  @Post(':id/default')
  setDefaultAddress(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.addressesService.setDefaultAddress(req.user.id, id);
  }
}
