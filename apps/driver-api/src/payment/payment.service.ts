import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, TransactionAction, PaymentMode } from 'database';
import * as crypto from 'crypto';

export interface CommissionConfig {
  platformCommissionRate: number;
  fleetCommissionRate?: number;
  minimumPlatformCommission?: number;
}

export interface CommissionBreakdown {
  orderAmount: number;
  platformCommissionRate: number;
  platformCommission: number;
  fleetCommissionRate: number;
  fleetCommission: number;
  driverEarnings: number;
  tipAmount: number;
  totalDriverPayout: number;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  payUrl?: string;
  commission?: CommissionBreakdown;
  error?: string;
  requiresCustomerAction?: boolean;
}

export interface OrderPaymentDetails {
  orderId: number;
  customerId: number;
  driverId: number;
  orderAmount: number;
  tipAmount: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  currency: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  // SkipCash configuration
  private readonly skipCashBaseUrl: string;
  private readonly skipCashKeyId: string;
  private readonly skipCashSecretKey: string;
  private readonly skipCashWebhookUrl: string;
  private readonly skipCashReturnUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const environment = this.configService.get<string>('SKIPCASH_ENVIRONMENT', 'sandbox');
    this.skipCashBaseUrl = environment === 'production'
      ? 'https://api.skipcash.app'
      : 'https://skipcashtest.azurewebsites.net';
    this.skipCashKeyId = this.configService.get<string>('SKIPCASH_KEY_ID', '');
    this.skipCashSecretKey = this.configService.get<string>('SKIPCASH_SECRET_KEY', '');
    this.skipCashWebhookUrl = this.configService.get<string>('SKIPCASH_WEBHOOK_URL', '');
    this.skipCashReturnUrl = this.configService.get<string>('SKIPCASH_RETURN_URL', '');
  }

  /**
   * Calculate commission breakdown for an order
   */
  calculateCommission(
    orderAmount: number,
    tipAmount: number = 0,
    config: CommissionConfig = { platformCommissionRate: 20 },
  ): CommissionBreakdown {
    let platformCommission = (orderAmount * config.platformCommissionRate) / 100;

    if (config.minimumPlatformCommission && platformCommission < config.minimumPlatformCommission) {
      platformCommission = config.minimumPlatformCommission;
    }

    platformCommission = Math.min(platformCommission, orderAmount);

    const afterPlatform = orderAmount - platformCommission;
    let fleetCommission = 0;

    if (config.fleetCommissionRate && config.fleetCommissionRate > 0) {
      fleetCommission = (afterPlatform * config.fleetCommissionRate) / 100;
    }

    const driverEarnings = orderAmount - platformCommission - fleetCommission;
    const totalDriverPayout = driverEarnings + tipAmount;

    return {
      orderAmount: this.round(orderAmount),
      platformCommissionRate: config.platformCommissionRate,
      platformCommission: this.round(platformCommission),
      fleetCommissionRate: config.fleetCommissionRate || 0,
      fleetCommission: this.round(fleetCommission),
      driverEarnings: this.round(driverEarnings),
      tipAmount: this.round(tipAmount),
      totalDriverPayout: this.round(totalDriverPayout),
    };
  }

  /**
   * Get commission configuration for a driver
   */
  private async getCommissionConfig(driverId: number): Promise<CommissionConfig> {
    const commissionSetting = await this.prisma.setting.findFirst({
      where: { key: 'platform_commission_rate' },
    });
    const platformCommissionRate = commissionSetting ? parseFloat(commissionSetting.value) : 20;

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { fleet: true },
    });

    const fleetCommissionRate = driver?.fleet?.commissionSharePercent
      ? Number(driver.fleet.commissionSharePercent)
      : 0;

    return { platformCommissionRate, fleetCommissionRate };
  }

  /**
   * Process complete order payment - handles all payment modes
   */
  async processCompleteOrderPayment(details: OrderPaymentDetails): Promise<PaymentResult> {
    this.logger.log(`Processing payment for order #${details.orderId}: ${details.paymentMode}, amount=${details.totalAmount} QAR`);

    const config = await this.getCommissionConfig(details.driverId);
    const commission = this.calculateCommission(details.orderAmount, details.tipAmount, config);

    try {
      switch (details.paymentMode) {
        case PaymentMode.cash:
          return await this.processCashPayment(details, commission);

        case PaymentMode.wallet:
          return await this.processWalletPayment(details, commission);

        case PaymentMode.saved_payment_method:
        case PaymentMode.payment_gateway:
          return await this.processCardPayment(details, commission);

        default:
          // Default to cash behavior
          return await this.processCashPayment(details, commission);
      }
    } catch (error) {
      this.logger.error(`Payment failed for order #${details.orderId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        commission,
      };
    }
  }

  /**
   * Process cash payment
   * Driver collected cash - deduct commission from driver wallet
   */
  private async processCashPayment(
    details: OrderPaymentDetails,
    commission: CommissionBreakdown,
  ): Promise<PaymentResult> {
    const paymentRef = `cash_${details.orderId}_${Date.now()}`;
    const commissionOwed = commission.platformCommission + commission.fleetCommission;

    await this.prisma.$transaction(async (tx) => {
      // 1. Record customer payment (cash collected by driver)
      await tx.customerTransaction.create({
        data: {
          customerId: details.customerId,
          orderId: details.orderId,
          type: TransactionType.debit,
          action: TransactionAction.ride_payment,
          amount: details.totalAmount,
          currency: 'QAR',
          description: `Cash payment for ride #${details.orderId}`,
          reference: paymentRef,
        },
      });

      // 2. Deduct commission from driver wallet
      await tx.driverTransaction.create({
        data: {
          driverId: details.driverId,
          orderId: details.orderId,
          type: TransactionType.debit,
          action: TransactionAction.commission,
          amount: commissionOwed,
          currency: 'QAR',
          description: `Platform commission (${commission.platformCommissionRate}%) for order #${details.orderId}`,
          reference: paymentRef,
        },
      });

      await tx.driver.update({
        where: { id: details.driverId },
        data: { walletBalance: { decrement: commissionOwed } },
      });

      // 3. Record tip if any
      if (details.tipAmount > 0) {
        await tx.driverTransaction.create({
          data: {
            driverId: details.driverId,
            orderId: details.orderId,
            type: TransactionType.credit,
            action: TransactionAction.tip,
            amount: details.tipAmount,
            currency: 'QAR',
            description: `Tip from customer for order #${details.orderId}`,
            reference: paymentRef,
          },
        });

        await tx.driver.update({
          where: { id: details.driverId },
          data: { walletBalance: { increment: details.tipAmount } },
        });
      }

      // 4. Update order with payment details
      await tx.order.update({
        where: { id: details.orderId },
        data: {
          paidAmount: details.totalAmount,
          providerShare: commissionOwed,
          paymentGatewayRef: paymentRef,
        },
      });
    });

    this.logger.log(`Cash payment completed for order #${details.orderId}, commission: ${commissionOwed} QAR`);

    return {
      success: true,
      paymentId: paymentRef,
      commission,
    };
  }

  /**
   * Process wallet payment
   * Deduct from customer wallet, credit driver earnings
   */
  private async processWalletPayment(
    details: OrderPaymentDetails,
    commission: CommissionBreakdown,
  ): Promise<PaymentResult> {
    // Check customer wallet balance
    const customer = await this.prisma.customer.findUnique({
      where: { id: details.customerId },
      select: { walletBalance: true },
    });

    if (!customer || Number(customer.walletBalance) < details.totalAmount) {
      return {
        success: false,
        error: 'Insufficient wallet balance',
        requiresCustomerAction: true,
        commission,
      };
    }

    const paymentRef = `wallet_${details.orderId}_${Date.now()}`;
    const commissionOwed = commission.platformCommission + commission.fleetCommission;

    await this.prisma.$transaction(async (tx) => {
      // 1. Deduct from customer wallet
      await tx.customer.update({
        where: { id: details.customerId },
        data: { walletBalance: { decrement: details.totalAmount } },
      });

      await tx.customerTransaction.create({
        data: {
          customerId: details.customerId,
          orderId: details.orderId,
          type: TransactionType.debit,
          action: TransactionAction.ride_payment,
          amount: details.totalAmount,
          currency: 'QAR',
          description: `Wallet payment for ride #${details.orderId}`,
          reference: paymentRef,
        },
      });

      // 2. Credit driver earnings (after commission)
      await tx.driverTransaction.create({
        data: {
          driverId: details.driverId,
          orderId: details.orderId,
          type: TransactionType.credit,
          action: TransactionAction.ride_earning,
          amount: commission.driverEarnings,
          currency: 'QAR',
          description: `Earnings for order #${details.orderId} (${commission.platformCommissionRate}% commission deducted)`,
          reference: paymentRef,
        },
      });

      await tx.driver.update({
        where: { id: details.driverId },
        data: { walletBalance: { increment: commission.driverEarnings } },
      });

      // 3. Credit tip separately
      if (details.tipAmount > 0) {
        await tx.driverTransaction.create({
          data: {
            driverId: details.driverId,
            orderId: details.orderId,
            type: TransactionType.credit,
            action: TransactionAction.tip,
            amount: details.tipAmount,
            currency: 'QAR',
            description: `Tip from customer for order #${details.orderId}`,
            reference: paymentRef,
          },
        });

        await tx.driver.update({
          where: { id: details.driverId },
          data: { walletBalance: { increment: details.tipAmount } },
        });
      }

      // 4. Update order with payment details
      await tx.order.update({
        where: { id: details.orderId },
        data: {
          paidAmount: details.totalAmount,
          providerShare: commissionOwed,
          paymentGatewayRef: paymentRef,
        },
      });
    });

    this.logger.log(`Wallet payment completed for order #${details.orderId}`);

    return {
      success: true,
      paymentId: paymentRef,
      commission,
    };
  }

  /**
   * Process card payment via SkipCash
   * Creates a payment link for the customer to complete
   */
  private async processCardPayment(
    details: OrderPaymentDetails,
    commission: CommissionBreakdown,
  ): Promise<PaymentResult> {
    // If SkipCash is not configured, simulate payment
    if (!this.skipCashKeyId || !this.skipCashSecretKey) {
      this.logger.warn('SkipCash not configured, simulating card payment');
      return await this.simulateCardPayment(details, commission);
    }

    // Create SkipCash payment
    const uid = crypto.randomUUID();
    const transactionId = `order_${details.orderId}_${Date.now()}`;

    const params: Record<string, string> = {
      Uid: uid,
      KeyId: this.skipCashKeyId,
      Amount: details.totalAmount.toFixed(2),
      FirstName: details.customerName.split(' ')[0] || 'Customer',
      LastName: details.customerName.split(' ').slice(1).join(' ') || '',
      Email: details.customerEmail || `customer${details.customerId}@wasel.app`,
      Phone: details.customerPhone || '',
      TransactionId: transactionId,
      Custom1: JSON.stringify({
        orderId: details.orderId,
        customerId: details.customerId,
        driverId: details.driverId,
      }),
    };

    const signature = this.generateSkipCashSignature(params);

    try {
      const response = await fetch(`${this.skipCashBaseUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': signature,
        },
        body: JSON.stringify({
          uid: params.Uid,
          keyId: params.KeyId,
          amount: params.Amount,
          firstName: params.FirstName,
          lastName: params.LastName,
          email: params.Email,
          phone: params.Phone,
          transactionId: params.TransactionId,
          custom1: params.Custom1,
          webhookUrl: this.skipCashWebhookUrl,
          returnUrl: this.skipCashReturnUrl,
        }),
      });

      const data = await response.json();

      if (data.returnCode === 200 && data.resultObj) {
        // Store payment reference
        await this.prisma.order.update({
          where: { id: details.orderId },
          data: { paymentGatewayRef: data.resultObj.id },
        });

        this.logger.log(`SkipCash payment created for order #${details.orderId}: ${data.resultObj.id}`);

        return {
          success: false, // Not yet completed - needs customer action
          paymentId: data.resultObj.id,
          payUrl: data.resultObj.payUrl,
          requiresCustomerAction: true,
          commission,
        };
      } else {
        throw new Error(data.errorMessage || 'SkipCash payment creation failed');
      }
    } catch (error) {
      this.logger.error(`SkipCash API error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        requiresCustomerAction: true,
        commission,
      };
    }
  }

  /**
   * Simulate card payment for development
   */
  private async simulateCardPayment(
    details: OrderPaymentDetails,
    commission: CommissionBreakdown,
  ): Promise<PaymentResult> {
    const paymentRef = `sim_card_${details.orderId}_${Date.now()}`;
    const commissionOwed = commission.platformCommission + commission.fleetCommission;

    await this.prisma.$transaction(async (tx) => {
      // 1. Record customer payment
      await tx.customerTransaction.create({
        data: {
          customerId: details.customerId,
          orderId: details.orderId,
          type: TransactionType.debit,
          action: TransactionAction.ride_payment,
          amount: details.totalAmount,
          currency: 'QAR',
          description: `Card payment (simulated) for ride #${details.orderId}`,
          reference: paymentRef,
        },
      });

      // 2. Credit driver earnings
      await tx.driverTransaction.create({
        data: {
          driverId: details.driverId,
          orderId: details.orderId,
          type: TransactionType.credit,
          action: TransactionAction.ride_earning,
          amount: commission.driverEarnings,
          currency: 'QAR',
          description: `Earnings for order #${details.orderId} (card payment)`,
          reference: paymentRef,
        },
      });

      await tx.driver.update({
        where: { id: details.driverId },
        data: { walletBalance: { increment: commission.driverEarnings } },
      });

      // 3. Credit tip
      if (details.tipAmount > 0) {
        await tx.driverTransaction.create({
          data: {
            driverId: details.driverId,
            orderId: details.orderId,
            type: TransactionType.credit,
            action: TransactionAction.tip,
            amount: details.tipAmount,
            currency: 'QAR',
            description: `Tip from customer for order #${details.orderId}`,
            reference: paymentRef,
          },
        });

        await tx.driver.update({
          where: { id: details.driverId },
          data: { walletBalance: { increment: details.tipAmount } },
        });
      }

      // 4. Update order
      await tx.order.update({
        where: { id: details.orderId },
        data: {
          paidAmount: details.totalAmount,
          providerShare: commissionOwed,
          paymentGatewayRef: paymentRef,
        },
      });
    });

    this.logger.log(`Simulated card payment completed for order #${details.orderId}`);

    return {
      success: true,
      paymentId: paymentRef,
      commission,
    };
  }

  /**
   * Process SkipCash webhook - called when payment completes
   */
  async processSkipCashWebhook(payload: {
    id: string;
    status: string;
    statusId: number;
    transactionId?: string;
    custom1?: string;
  }): Promise<{ success: boolean; orderId?: number }> {
    this.logger.log(`Processing SkipCash webhook: ${payload.id}, status=${payload.status}`);

    // Find order by payment reference
    const order = await this.prisma.order.findFirst({
      where: { paymentGatewayRef: payload.id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        driver: { select: { id: true } },
      },
    });

    if (!order) {
      this.logger.warn(`Order not found for SkipCash payment: ${payload.id}`);
      return { success: false };
    }

    const isPaid = payload.status === 'paid' || payload.statusId === 2;

    if (isPaid && order.status === 'WaitingForPostPay') {
      const orderAmount = Number(order.costAfterCoupon || order.costBest);
      const tipAmount = Number(order.tipAmount || 0);
      const totalAmount = orderAmount + tipAmount;

      const config = await this.getCommissionConfig(order.driverId!);
      const commission = this.calculateCommission(orderAmount, tipAmount, config);
      const commissionOwed = commission.platformCommission + commission.fleetCommission;

      await this.prisma.$transaction(async (tx) => {
        // 1. Record customer payment
        await tx.customerTransaction.create({
          data: {
            customerId: order.customerId,
            orderId: order.id,
            type: TransactionType.debit,
            action: TransactionAction.ride_payment,
            amount: totalAmount,
            currency: 'QAR',
            description: `SkipCash payment for ride #${order.id}`,
            reference: payload.id,
          },
        });

        // 2. Credit driver earnings
        await tx.driverTransaction.create({
          data: {
            driverId: order.driverId!,
            orderId: order.id,
            type: TransactionType.credit,
            action: TransactionAction.ride_earning,
            amount: commission.driverEarnings,
            currency: 'QAR',
            description: `Earnings for order #${order.id} (SkipCash payment)`,
            reference: payload.id,
          },
        });

        await tx.driver.update({
          where: { id: order.driverId! },
          data: { walletBalance: { increment: commission.driverEarnings } },
        });

        // 3. Credit tip
        if (tipAmount > 0) {
          await tx.driverTransaction.create({
            data: {
              driverId: order.driverId!,
              orderId: order.id,
              type: TransactionType.credit,
              action: TransactionAction.tip,
              amount: tipAmount,
              currency: 'QAR',
              description: `Tip from customer for order #${order.id}`,
              reference: payload.id,
            },
          });

          await tx.driver.update({
            where: { id: order.driverId! },
            data: { walletBalance: { increment: tipAmount } },
          });
        }

        // 4. Update order status
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'Finished',
            finishedAt: new Date(),
            paidAmount: totalAmount,
            providerShare: commissionOwed,
          },
        });

        // 5. Create audit record
        await tx.orderActivity.create({
          data: {
            orderId: order.id,
            status: 'Finished',
            note: `Payment completed via SkipCash (${payload.id})`,
          },
        });
      });

      this.logger.log(`Order #${order.id} completed via SkipCash webhook`);
      return { success: true, orderId: order.id };
    }

    return { success: true, orderId: order.id };
  }

  /**
   * Generate SkipCash HMAC-SHA256 signature
   */
  private generateSkipCashSignature(params: Record<string, string>): string {
    const fields = ['Uid', 'KeyId', 'Amount', 'FirstName', 'LastName', 'Phone', 'Email',
                    'Street', 'City', 'State', 'Country', 'PostalCode', 'TransactionId', 'Custom1'];

    const combinedData = fields
      .filter(field => params[field] && params[field].trim() !== '')
      .map(field => `${field}=${params[field]}`)
      .join(',');

    return crypto.createHmac('sha256', this.skipCashSecretKey)
      .update(combinedData)
      .digest('base64');
  }

  /**
   * Get commission settings
   */
  async getCommissionSettings() {
    const settings = await this.prisma.setting.findMany({
      where: { key: { in: ['platform_commission_rate', 'minimum_commission'] } },
    });

    const settingsMap = settings.reduce(
      (acc, s) => ({ ...acc, [s.key]: s.value }),
      {} as Record<string, string>,
    );

    return {
      platformCommissionRate: parseFloat(settingsMap['platform_commission_rate'] || '20'),
      minimumCommission: parseFloat(settingsMap['minimum_commission'] || '0'),
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
