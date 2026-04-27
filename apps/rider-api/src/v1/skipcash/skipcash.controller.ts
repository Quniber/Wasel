import { Controller, Post, Body, Headers, Logger, HttpCode, Get, Query, Param, ParseIntPipe, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SkipCashService, SkipCashWebhookPayload } from './skipcash.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

interface CreatePrePaymentDto {
  amount: number;
  serviceId: number;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
}

@Controller({ path: 'skipcash', version: '1' })
export class SkipCashController {
  private readonly logger = new Logger(SkipCashController.name);
  private readonly ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:3000';

  constructor(
    private skipCashService: SkipCashService,
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Create a pre-payment link for card/Apple Pay.
   * Creates the Order with status=WaitingForPrePay first so the webhook can find it.
   * Once SkipCash sends StatusId=2 (paid), the webhook flips it to Requested and dispatches.
   */
  @Post('prepay')
  @UseGuards(JwtAuthGuard)
  async createPrePayment(
    @Request() req: any,
    @Body() dto: CreatePrePaymentDto,
  ) {
    const customerId = req.user.id || req.user.sub;
    if (!customerId) {
      throw new BadRequestException('Customer ID not found in token');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: Number(customerId) },
      select: { id: true, firstName: true, lastName: true, email: true, mobileNumber: true },
    });
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const addresses = JSON.stringify([
      {
        type: 'pickup',
        address: dto.pickupAddress,
        latitude: dto.pickupLatitude,
        longitude: dto.pickupLongitude,
      },
      {
        type: 'dropoff',
        address: dto.dropoffAddress,
        latitude: dto.dropoffLatitude,
        longitude: dto.dropoffLongitude,
      },
    ]);

    const order = await this.prisma.order.create({
      data: {
        customerId: Number(customerId),
        serviceId: dto.serviceId,
        addresses,
        points: '[]',
        pickupAddress: dto.pickupAddress,
        pickupLatitude: dto.pickupLatitude,
        pickupLongitude: dto.pickupLongitude,
        dropoffAddress: dto.dropoffAddress,
        dropoffLatitude: dto.dropoffLatitude,
        dropoffLongitude: dto.dropoffLongitude,
        serviceCost: dto.amount,
        costBest: dto.amount,
        currency: 'QAR',
        paymentMode: 'payment_gateway',
        status: 'WaitingForPrePay',
      },
    });

    const transactionId = `order_${order.id}`;

    const result = await this.skipCashService.createPrePayment({
      amount: dto.amount,
      firstName: customer.firstName || 'Customer',
      lastName: customer.lastName || '',
      email: customer.email || `customer${customerId}@wasel.app`,
      phone: customer.mobileNumber || undefined,
      transactionId,
      customerId: Number(customerId),
      orderId: order.id,
    });

    if (!result.success) {
      // SkipCash refused — release the order slot.
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'Expired' },
      });
      throw new BadRequestException(result.error || 'Failed to create payment');
    }

    // Store the SkipCash PaymentId so the webhook can find this order by paymentGatewayRef.
    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentGatewayRef: result.paymentId },
    });

    return {
      success: true,
      orderId: order.id,
      paymentId: result.paymentId,
      payUrl: result.payUrl,
      transactionId,
      amount: dto.amount,
      currency: 'QAR',
    };
  }

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
    const customerId = req.user.id;

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
   * Webhook endpoint for SkipCash payment notifications.
   * Always returns 200 — failure response would cause SkipCash to retry up to 3 times.
   * Per SkipCash spec: signature is in the `Authorization` header, signed with the WEBHOOK key.
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: SkipCashWebhookPayload,
    @Headers('authorization') signature?: string,
  ) {
    this.logger.log(`Received SkipCash webhook: ${JSON.stringify(payload)}`);

    const isValid = this.skipCashService.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      this.logger.warn(
        `Rejecting SkipCash webhook with invalid signature (PaymentId=${payload?.PaymentId})`,
      );
      return { success: false, error: 'Invalid signature' };
    }

    const result = await this.skipCashService.processWebhook(payload);

    // Prepay flipped from WaitingForPrePay → Requested. Trigger dispatch.
    if (result.shouldDispatch && result.orderId) {
      await this.dispatchOrder(result.orderId);
    }

    return {
      success: result.success,
      orderId: result.orderId,
    };
  }

  private async dispatchOrder(orderId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.ADMIN_API_URL}/api/internal/orders/${orderId}/dispatch`),
      );
      this.logger.log(`Order ${orderId} dispatched`);
    } catch (err: any) {
      this.logger.error(`Failed to dispatch order ${orderId}: ${err.message}`);
      // Don't throw — order is paid and in Requested state, dispatch can be retried.
    }
  }

  /**
   * Return URL handler — UX only.
   * The webhook is the source of truth for order state. This endpoint just checks status
   * and returns a deep link so the WebView can redirect back into the app.
   *
   * Simulation: when ?simulated=true, fires processWebhook directly with a synthetic
   * Paid payload so local development can drive the success path without real SkipCash.
   */
  @Get('return')
  async handleReturn(
    @Query('type') type?: string,
    @Query('orderId') orderId?: string,
    @Query('paymentId') paymentId?: string,
    @Query('simulated') simulated?: string,
    @Query('amount') amount?: string,
  ) {
    this.logger.log(
      `Payment return: type=${type}, orderId=${orderId}, paymentId=${paymentId}, simulated=${simulated}`,
    );

    // Simulated mode: fire a synthetic Paid webhook so local dev can drive the success path.
    if (simulated === 'true' && paymentId && orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: Number(orderId) } });
      if (order && !order.paymentGatewayRef) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { paymentGatewayRef: paymentId },
        });
      }
      const result = await this.skipCashService.processWebhook({
        PaymentId: paymentId,
        Amount: amount || '0',
        StatusId: 2,
        TransactionId: `order_${orderId}`,
      });
      if (result.shouldDispatch && result.orderId) {
        await this.dispatchOrder(result.orderId);
      }
      const redirect =
        type === 'prepay'
          ? `waselrider://payment-success?orderId=${orderId}&paymentId=${paymentId}`
          : `waselrider://payment-complete?orderId=${orderId}`;
      return {
        success: true,
        message: 'Payment completed (simulated)',
        orderId: Number(orderId),
        redirect,
      };
    }

    if (!paymentId) {
      return { success: false, message: 'Missing payment information' };
    }

    // Real flow: check current status from SkipCash. The webhook will (or already did)
    // update order state; this just gives the WebView a redirect URL.
    const status = await this.skipCashService.getPaymentStatus(paymentId);
    const successPath =
      type === 'prepay'
        ? `waselrider://payment-success?orderId=${orderId}&paymentId=${paymentId}`
        : `waselrider://payment-complete?orderId=${orderId}`;
    const failPath =
      type === 'prepay'
        ? `waselrider://payment-failed?orderId=${orderId}&paymentId=${paymentId}`
        : `waselrider://payment-failed?orderId=${orderId}`;

    return {
      success: status.paid,
      status: status.status,
      redirect: status.paid ? successPath : failPath,
    };
  }
}
