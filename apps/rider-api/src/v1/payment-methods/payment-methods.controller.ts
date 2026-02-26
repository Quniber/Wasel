import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({ path: 'payment-methods', version: '1' })
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private paymentMethodsService: PaymentMethodsService) {}

  // Get payment gateways
  @Get('gateways')
  getPaymentGateways() {
    return this.paymentMethodsService.getPaymentGateways();
  }

  // Get saved payment methods
  @Get()
  getPaymentMethods(@Req() req: any) {
    return this.paymentMethodsService.getPaymentMethods(req.user.id);
  }

  // Add payment method
  @Post()
  addPaymentMethod(
    @Req() req: any,
    @Body()
    body: {
      paymentGatewayId: number;
      title: string;
      token: string;
      lastFour?: string;
      providerBrand?: string;
    },
  ) {
    return this.paymentMethodsService.addPaymentMethod(req.user.id, body);
  }

  // Set default payment method
  @Post(':id/default')
  setDefaultPaymentMethod(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodsService.setDefaultPaymentMethod(req.user.id, id);
  }

  // Delete payment method
  @Delete(':id')
  deletePaymentMethod(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodsService.deletePaymentMethod(req.user.id, id);
  }
}
