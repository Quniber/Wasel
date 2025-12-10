import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.couponsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      code: string;
      title: string;
      description?: string;
      discountType: 'fixed' | 'percent';
      discountAmount: number;
      minimumOrderAmount?: number;
      maximumDiscount?: number;
      usageLimit?: number;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    },
  ) {
    return this.couponsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      code?: string;
      title?: string;
      description?: string;
      discountType?: 'fixed' | 'percent';
      discountAmount?: number;
      minimumOrderAmount?: number;
      maximumDiscount?: number;
      usageLimit?: number;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    },
  ) {
    return this.couponsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.remove(id);
  }
}
