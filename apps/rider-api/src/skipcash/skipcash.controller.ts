import { Controller, Post, Body, Headers, Logger, HttpCode, Get, Query, Param, ParseIntPipe, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SkipCashService, SkipCashWebhookPayload } from './skipcash.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
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

@Controller('skipcash')
export class SkipCashController {
  private readonly logger = new Logger(SkipCashController.name);
  private readonly ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:3002';

  constructor(
    private skipCashService: SkipCashService,
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Create a pre-payment link for card/Apple Pay before creating order
   * This is called when user selects Card payment and taps "Request Ride"
   */
  @Post('prepay')
  @UseGuards(JwtAuthGuard)
  async createPrePayment(
    @Request() req: any,
    @Body() dto: CreatePrePaymentDto,
  ) {
    this.logger.log(`createPrePayment - req.user: ${JSON.stringify(req.user)}`);

    // Try id first, then sub (depending on JWT payload structure)
    const customerId = req.user.id || req.user.sub;

    if (!customerId) {
      throw new BadRequestException('Customer ID not found in token');
    }

    this.logger.log(`createPrePayment - customerId: ${customerId}`);

    // Get customer details
    const customer = await this.prisma.customer.findUnique({
      where: { id: Number(customerId) },
      select: { id: true, firstName: true, lastName: true, email: true, mobileNumber: true },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const transactionId = `prepay_${customerId}_${Date.now()}`;

    // Create SkipCash payment (without order - we'll create order after payment)
    const result = await this.skipCashService.createPrePayment({
      amount: dto.amount,
      firstName: customer.firstName || 'Customer',
      lastName: customer.lastName || '',
      email: customer.email || `customer${customerId}@wasel.app`,
      phone: customer.mobileNumber || undefined,
      transactionId,
      customerId,
      // Store booking details in custom field for order creation after payment
      bookingDetails: {
        serviceId: dto.serviceId,
        pickupAddress: dto.pickupAddress,
        pickupLatitude: dto.pickupLatitude,
        pickupLongitude: dto.pickupLongitude,
        dropoffAddress: dto.dropoffAddress,
        dropoffLatitude: dto.dropoffLatitude,
        dropoffLongitude: dto.dropoffLongitude,
        amount: dto.amount,
      },
    });

    if (result.success) {
      return {
        success: true,
        paymentId: result.paymentId,
        payUrl: result.payUrl,
        transactionId,
        amount: dto.amount,
        currency: 'QAR',
      };
    } else {
      throw new BadRequestException(result.error || 'Failed to create payment');
    }
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
    @Query('type') type?: string,
    @Query('orderId') orderId?: string,
    @Query('paymentId') paymentId?: string,
    @Query('simulated') simulated?: string,
    @Query('customerId') customerId?: string,
    @Query('bookingDetails') bookingDetailsJson?: string,
  ) {
    this.logger.log(`Payment return: type=${type}, orderId=${orderId}, paymentId=${paymentId}`);

    // Handle pre-payment returns (payment before order creation)
    if (type === 'prepay') {
      // For simulated pre-payments
      if (simulated === 'true' && paymentId && customerId && bookingDetailsJson) {
        try {
          const bookingDetails = JSON.parse(decodeURIComponent(bookingDetailsJson));

          // Build addresses JSON array (required field)
          const addresses = JSON.stringify([
            {
              type: 'pickup',
              address: bookingDetails.pickupAddress,
              latitude: bookingDetails.pickupLatitude,
              longitude: bookingDetails.pickupLongitude,
            },
            {
              type: 'dropoff',
              address: bookingDetails.dropoffAddress,
              latitude: bookingDetails.dropoffLatitude,
              longitude: bookingDetails.dropoffLongitude,
            },
          ]);

          // Create the order now that payment is complete
          const order = await this.prisma.order.create({
            data: {
              customerId: parseInt(customerId),
              serviceId: bookingDetails.serviceId,
              addresses,
              points: '[]',
              pickupAddress: bookingDetails.pickupAddress,
              pickupLatitude: bookingDetails.pickupLatitude,
              pickupLongitude: bookingDetails.pickupLongitude,
              dropoffAddress: bookingDetails.dropoffAddress,
              dropoffLatitude: bookingDetails.dropoffLatitude,
              dropoffLongitude: bookingDetails.dropoffLongitude,
              serviceCost: bookingDetails.amount,
              costBest: bookingDetails.amount,
              currency: 'QAR',
              paymentMode: 'payment_gateway',
              paymentGatewayRef: paymentId,
              status: 'Requested',
            },
          });

          this.logger.log(`Pre-payment order created: ${order.id}`);

          // Dispatch order to drivers via admin-api
          try {
            await firstValueFrom(
              this.httpService.post(`${this.ADMIN_API_URL}/api/internal/orders/${order.id}/dispatch`),
            );
            this.logger.log(`Order ${order.id} dispatched successfully`);
          } catch (dispatchError: any) {
            this.logger.error(`Failed to dispatch order ${order.id}:`, dispatchError.message);
            // Don't fail - order is created, dispatch can be retried
          }

          return {
            success: true,
            message: 'Payment completed, order created',
            orderId: order.id,
            redirect: `waselrider://payment-success?orderId=${order.id}&paymentId=${paymentId}`,
          };
        } catch (error) {
          this.logger.error(`Error creating order from pre-payment: ${error.message}`);
          return {
            success: false,
            message: 'Payment successful but order creation failed',
            redirect: `waselrider://payment-failed?error=order_creation`,
          };
        }
      }

      // For real pre-payments, check status and create order
      if (paymentId) {
        const status = await this.skipCashService.getPaymentStatus(paymentId);
        if (status.paid) {
          return {
            success: true,
            status: status.status,
            message: 'Pre-payment successful',
            redirect: `waselrider://payment-success?paymentId=${paymentId}`,
          };
        } else {
          return {
            success: false,
            status: status.status,
            redirect: `waselrider://payment-failed?paymentId=${paymentId}`,
          };
        }
      }
    }

    // Handle post-ride payment returns (existing flow)
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
