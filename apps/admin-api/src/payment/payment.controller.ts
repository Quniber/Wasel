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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { TransactionType, TransactionAction, PaymentGatewayType } from 'database';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // =====================
  // Payment Gateways
  // =====================

  @Get('gateways')
  async getPaymentGateways() {
    return this.paymentService.getPaymentGateways();
  }

  @Post('gateways')
  async createPaymentGateway(
    @Body()
    body: {
      type: PaymentGatewayType;
      title: string;
      description?: string;
      publicKey?: string;
      privateKey: string;
      merchantId?: string;
      saltKey?: string;
      mediaId?: number;
      isEnabled?: boolean;
    },
  ) {
    return this.paymentService.createPaymentGateway(body);
  }

  @Patch('gateways/:id')
  async updatePaymentGateway(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      title?: string;
      description?: string;
      publicKey?: string;
      privateKey?: string;
      merchantId?: string;
      saltKey?: string;
      mediaId?: number;
      isEnabled?: boolean;
    },
  ) {
    return this.paymentService.updatePaymentGateway(id, body);
  }

  @Delete('gateways/:id')
  async deletePaymentGateway(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.deletePaymentGateway(id);
  }

  // =====================
  // Transactions
  // =====================

  @Get('customer-transactions')
  async getCustomerTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('customerId') customerId?: string,
    @Query('type') type?: TransactionType,
    @Query('action') action?: TransactionAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentService.getCustomerTransactions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      {
        customerId: customerId ? parseInt(customerId) : undefined,
        type,
        action,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    );
  }

  @Get('driver-transactions')
  async getDriverTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('driverId') driverId?: string,
    @Query('type') type?: TransactionType,
    @Query('action') action?: TransactionAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentService.getDriverTransactions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      {
        driverId: driverId ? parseInt(driverId) : undefined,
        type,
        action,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    );
  }

  // =====================
  // Wallet Adjustments
  // =====================

  @Post('customers/:id/wallet/adjust')
  async adjustCustomerWallet(
    @Request() req: any,
    @Param('id', ParseIntPipe) customerId: number,
    @Body() body: { amount: number; description: string },
  ) {
    return this.paymentService.adjustCustomerWallet(
      customerId,
      body.amount,
      body.description,
      req.user.sub,
    );
  }

  @Post('drivers/:id/wallet/adjust')
  async adjustDriverWallet(
    @Request() req: any,
    @Param('id', ParseIntPipe) driverId: number,
    @Body() body: { amount: number; description: string },
  ) {
    return this.paymentService.adjustDriverWallet(
      driverId,
      body.amount,
      body.description,
      req.user.sub,
    );
  }

  // =====================
  // Refunds
  // =====================

  @Post('orders/:id/refund')
  async processRefund(
    @Request() req: any,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.paymentService.processRefund(
      orderId,
      body.amount,
      body.reason,
      req.user.sub,
    );
  }

  // =====================
  // Reports
  // =====================

  @Get('stats')
  async getPaymentStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentService.getPaymentStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('commission-report')
  async getCommissionReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentService.getCommissionReport(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
