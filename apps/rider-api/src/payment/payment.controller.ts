import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService, PaymentMethod } from './payment.service';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // =====================
  // Payment Methods
  // =====================

  @Get('methods')
  async getPaymentMethods(@Request() req: any) {
    return this.paymentService.getAvailablePaymentMethods(req.user.sub);
  }

  // =====================
  // Cards
  // =====================

  @Post('cards/validate')
  async validateCard(
    @Body()
    body: {
      cardNumber: string;
      expiryMonth: number;
      expiryYear: number;
      cvv: string;
      holderName: string;
    },
  ) {
    return this.paymentService.validateCard(body);
  }

  @Post('cards')
  async saveCard(
    @Request() req: any,
    @Body() body: { cardToken: string; setAsDefault?: boolean },
  ) {
    return this.paymentService.saveCard(req.user.sub, body.cardToken, body.setAsDefault);
  }

  @Get('cards')
  async getCards(@Request() req: any) {
    return this.paymentService.getCustomerCards(req.user.sub);
  }

  @Delete('cards/:id')
  async deleteCard(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.paymentService.deleteCard(req.user.sub, id);
  }

  // =====================
  // Wallet
  // =====================

  @Post('wallet/topup')
  async topUpWallet(
    @Request() req: any,
    @Body()
    body: {
      amount: number;
      paymentMethodId?: number;
      cardToken?: string;
    },
  ) {
    return this.paymentService.topUpWallet(
      req.user.sub,
      body.amount,
      body.paymentMethodId,
      body.cardToken,
    );
  }

  // =====================
  // Order Payment
  // =====================

  @Post('orders/:orderId/pay')
  async payForOrder(
    @Request() req: any,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body()
    body: {
      amount: number;
      paymentMethod: PaymentMethod;
      paymentMethodId?: number;
    },
  ) {
    return this.paymentService.processOrderPayment(
      req.user.sub,
      orderId,
      body.amount,
      body.paymentMethod,
      body.paymentMethodId,
    );
  }
}
