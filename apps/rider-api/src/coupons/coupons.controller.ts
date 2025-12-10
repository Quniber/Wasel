import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  // Get available coupons
  @Get()
  getAvailableCoupons(@Req() req: any) {
    return this.couponsService.getAvailableCoupons(req.user.id);
  }

  // Validate coupon (check if valid without applying)
  @Get('validate')
  validateCoupon(
    @Req() req: any,
    @Query('code') code: string,
  ) {
    return this.couponsService.validateCouponCode(req.user.id, code);
  }

  // Apply coupon to order (calculate discount)
  @Post('apply')
  applyCoupon(
    @Req() req: any,
    @Body() body: { code: string; orderAmount: number },
  ) {
    return this.couponsService.applyCoupon(req.user.id, body.code, body.orderAmount);
  }

  // Get coupon by code
  @Get(':code')
  getCouponByCode(@Param('code') code: string) {
    return this.couponsService.getCouponByCode(code);
  }
}
