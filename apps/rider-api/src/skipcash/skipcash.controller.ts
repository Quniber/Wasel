import { Controller, Post, Body, Headers, Logger, HttpCode, Get, Query, Param, ParseIntPipe, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { SkipCashService, SkipCashWebhookPayload } from './skipcash.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('skipcash')
export class SkipCashController {
  private readonly logger = new Logger(SkipCashController.name);

  constructor(
    private skipCashService: SkipCashService,
    private prisma: PrismaService,
  ) {}

  /**
   * Create a payment link for an order (requires authentication)
   * Used when rider needs to pay for an order in WaitingForPostPay status
   */
  @Post('orders/:orderId/pay')
  @UseGuards(JwtAuthGuard)
  async createPaymentForOrder(
    @Request() req: any,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const customerId = req.user.sub;

    // Find the order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, mobileNumber: true },
        },
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.customerId !== customerId) {
      throw new BadRequestException('Order does not belong to this customer');
    }

    if (order.status !== 'WaitingForPostPay') {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const amount = Number(order.costAfterCoupon || order.costBest);
    const tipAmount = Number(order.tipAmount || 0);
    const totalAmount = amount + tipAmount;

    // Create SkipCash payment
    const result = await this.skipCashService.createPayment({
      amount: totalAmount,
      firstName: order.customer.firstName || 'Customer',
      lastName: order.customer.lastName || '',
      email: order.customer.email || `customer${customerId}@wasel.app`,
      phone: order.customer.mobileNumber || undefined,
      transactionId: `order_${orderId}_${Date.now()}`,
      orderId: orderId,
      customerId: customerId,
    });

    if (result.success) {
      return {
        success: true,
        paymentId: result.paymentId,
        payUrl: result.payUrl,
        amount: totalAmount,
        currency: 'QAR',
      };
    } else {
      throw new BadRequestException(result.error || 'Failed to create payment');
    }
  }

  /**
   * Webhook endpoint for SkipCash payment notifications
   * This is called by SkipCash when a payment status changes
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: SkipCashWebhookPayload,
    @Headers('x-skipcash-signature') signature?: string,
  ) {
    this.logger.log(`Received SkipCash webhook: ${JSON.stringify(payload)}`);

    // Verify signature if provided
    if (signature) {
      const isValid = this.skipCashService.verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
      );
      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        return { success: false, error: 'Invalid signature' };
      }
    }

    // Process the webhook
    const result = await this.skipCashService.processWebhook(payload);

    return {
      success: result.success,
      orderId: result.orderId,
    };
  }

  /**
   * Return URL handler - where users are redirected after payment
   * This can update the order status and redirect to the app
   */
  @Get('return')
  async handleReturn(
    @Query('orderId') orderId?: string,
    @Query('paymentId') paymentId?: string,
    @Query('simulated') simulated?: string,
  ) {
    this.logger.log(`Payment return: orderId=${orderId}, paymentId=${paymentId}`);

    // For simulated payments, auto-complete
    if (simulated === 'true' && orderId && paymentId) {
      await this.skipCashService.processWebhook({
        id: paymentId,
        statusId: 2,
        status: 'paid',
        amount: '0',
        transactionId: orderId,
      });

      return {
        success: true,
        message: 'Payment completed (simulated)',
        redirect: `waselrider://payment-complete?orderId=${orderId}`,
      };
    }

    // For real payments, check status
    if (paymentId) {
      const status = await this.skipCashService.getPaymentStatus(paymentId);
      return {
        success: status.paid,
        status: status.status,
        redirect: status.paid
          ? `waselrider://payment-complete?orderId=${orderId}`
          : `waselrider://payment-failed?orderId=${orderId}`,
      };
    }

    return {
      success: false,
      message: 'Missing payment information',
    };
  }
}
