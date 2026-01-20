import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface SkipCashPaymentRequest {
  amount: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  transactionId: string;
  orderId: number;
  customerId: number;
}

export interface SkipCashPaymentResponse {
  success: boolean;
  paymentId?: string;
  payUrl?: string;
  error?: string;
}

export interface SkipCashWebhookPayload {
  id: string;
  statusId: number;
  status: string;
  amount: string;
  transactionId: string;
  custom1?: string;
  custom2?: string;
  finishedDate?: string;
  cardType?: string;
  cardNumber?: string;
  tokenId?: string;
}

@Injectable()
export class SkipCashService {
  private readonly logger = new Logger(SkipCashService.name);
  private readonly baseUrl: string;
  private readonly keyId: string;
  private readonly secretKey: string;
  private readonly webhookUrl: string;
  private readonly returnUrl: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const environment = this.configService.get<string>('SKIPCASH_ENVIRONMENT', 'sandbox');
    this.baseUrl = environment === 'production'
      ? 'https://api.skipcash.app'
      : 'https://skipcashtest.azurewebsites.net';

    this.keyId = this.configService.get<string>('SKIPCASH_KEY_ID', '');
    this.secretKey = this.configService.get<string>('SKIPCASH_SECRET_KEY', '');
    this.webhookUrl = this.configService.get<string>('SKIPCASH_WEBHOOK_URL', '');
    this.returnUrl = this.configService.get<string>('SKIPCASH_RETURN_URL', '');
  }

  /**
   * Generate HMAC-SHA256 signature for SkipCash API
   */
  private generateSignature(params: Record<string, string>): string {
    // Combine parameters in the required order
    const fields = ['Uid', 'KeyId', 'Amount', 'FirstName', 'LastName', 'Phone', 'Email',
                    'Street', 'City', 'State', 'Country', 'PostalCode', 'TransactionId', 'Custom1'];

    const combinedData = fields
      .filter(field => params[field] && params[field].trim() !== '')
      .map(field => `${field}=${params[field]}`)
      .join(',');

    const hash = crypto.createHmac('sha256', this.secretKey)
      .update(combinedData)
      .digest('base64');

    return hash;
  }

  /**
   * Generate a unique UUID for the transaction
   */
  private generateUid(): string {
    return crypto.randomUUID();
  }

  /**
   * Create a payment request with SkipCash
   */
  async createPayment(request: SkipCashPaymentRequest): Promise<SkipCashPaymentResponse> {
    if (!this.keyId || !this.secretKey) {
      this.logger.warn('SkipCash credentials not configured, using simulation mode');
      return this.simulatePayment(request);
    }

    const uid = this.generateUid();
    const params: Record<string, string> = {
      Uid: uid,
      KeyId: this.keyId,
      Amount: request.amount.toFixed(2),
      FirstName: request.firstName,
      LastName: request.lastName,
      Email: request.email,
      Phone: request.phone || '',
      TransactionId: request.transactionId,
      Custom1: JSON.stringify({ orderId: request.orderId, customerId: request.customerId }),
    };

    const signature = this.generateSignature(params);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/payments`, {
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
          webhookUrl: this.webhookUrl,
          returnUrl: this.returnUrl,
        }),
      });

      const data = await response.json();

      if (data.returnCode === 200 && data.resultObj) {
        this.logger.log(`SkipCash payment created: ${data.resultObj.id}`);

        // Store the payment reference
        await this.prisma.order.update({
          where: { id: request.orderId },
          data: {
            paymentGatewayRef: data.resultObj.id,
          },
        });

        return {
          success: true,
          paymentId: data.resultObj.id,
          payUrl: data.resultObj.payUrl,
        };
      } else {
        this.logger.error(`SkipCash payment failed: ${data.errorMessage}`);
        return {
          success: false,
          error: data.errorMessage || 'Payment creation failed',
        };
      }
    } catch (error) {
      this.logger.error(`SkipCash API error: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to connect to payment gateway',
      };
    }
  }

  /**
   * Simulate payment for development/testing
   */
  private async simulatePayment(request: SkipCashPaymentRequest): Promise<SkipCashPaymentResponse> {
    const paymentId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    this.logger.log(`Simulated SkipCash payment created: ${paymentId}`);

    // Store the payment reference
    await this.prisma.order.update({
      where: { id: request.orderId },
      data: {
        paymentGatewayRef: paymentId,
      },
    });

    // In simulation mode, return a fake URL that would auto-complete
    return {
      success: true,
      paymentId,
      payUrl: `${this.returnUrl}?simulated=true&orderId=${request.orderId}&paymentId=${paymentId}`,
    };
  }

  /**
   * Verify webhook signature (if SkipCash provides one)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.secretKey) {
      return true; // Skip verification in simulation mode
    }

    const expectedSignature = crypto.createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('base64');

    return signature === expectedSignature;
  }

  /**
   * Process webhook callback from SkipCash
   */
  async processWebhook(payload: SkipCashWebhookPayload): Promise<{ success: boolean; orderId?: number }> {
    this.logger.log(`Processing SkipCash webhook: paymentId=${payload.id}, status=${payload.status}`);

    // Find the order by payment gateway reference or transaction ID
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { paymentGatewayRef: payload.id },
          { id: payload.transactionId ? parseInt(payload.transactionId) : -1 },
        ],
      },
      include: {
        customer: true,
        driver: true,
      },
    });

    if (!order) {
      this.logger.warn(`Order not found for payment: ${payload.id}`);
      return { success: false };
    }

    // Check payment status (statusId: 2 = paid, 3 = failed, etc.)
    const isPaid = payload.status === 'paid' || payload.statusId === 2;

    if (isPaid && order.status === 'WaitingForPostPay') {
      const amount = Number(order.costAfterCoupon || order.costBest);
      const tipAmount = Number(order.tipAmount || 0);
      const totalAmount = amount + tipAmount;

      // Update order status
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'Finished',
          finishedAt: new Date(),
          paidAmount: totalAmount,
        },
      });

      // Create customer transaction
      await this.prisma.customerTransaction.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          type: 'debit',
          action: 'ride_payment',
          amount: totalAmount,
          description: `SkipCash payment for order #${order.id}`,
        },
      });

      // Create order activity
      await this.prisma.orderActivity.create({
        data: {
          orderId: order.id,
          status: 'Finished',
          note: `Payment completed via SkipCash (${payload.id})`,
        },
      });

      // Credit driver earnings if driver exists
      if (order.driverId) {
        await this.creditDriverEarnings(order.driverId, order.id, amount, tipAmount);
      }

      this.logger.log(`Order #${order.id} payment completed via SkipCash`);
      return { success: true, orderId: order.id };
    }

    return { success: true, orderId: order.id };
  }

  /**
   * Credit driver earnings after successful payment
   */
  private async creditDriverEarnings(driverId: number, orderId: number, amount: number, tipAmount: number) {
    // Get platform commission rate
    const commissionSetting = await this.prisma.setting.findFirst({
      where: { key: 'platform_commission_rate' },
    });
    const platformCommissionRate = commissionSetting ? parseFloat(commissionSetting.value) : 20;

    // Check if driver has a fleet
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { fleet: true },
    });

    const fleetCommissionRate = driver?.fleet?.commissionSharePercent
      ? Number(driver.fleet.commissionSharePercent)
      : 0;

    // Calculate commissions
    const platformCommission = (amount * platformCommissionRate) / 100;
    const afterPlatform = amount - platformCommission;
    const fleetCommission = (afterPlatform * fleetCommissionRate) / 100;
    const driverEarnings = amount - platformCommission - fleetCommission;

    // Credit driver earnings
    await this.prisma.driverTransaction.create({
      data: {
        driverId,
        orderId,
        amount: driverEarnings,
        currency: 'QAR',
        type: 'credit',
        action: 'ride_earning',
        description: `Earnings for order #${orderId}`,
      },
    });

    await this.prisma.driver.update({
      where: { id: driverId },
      data: { walletBalance: { increment: driverEarnings } },
    });

    // Credit tip separately
    if (tipAmount > 0) {
      await this.prisma.driverTransaction.create({
        data: {
          driverId,
          orderId,
          amount: tipAmount,
          currency: 'QAR',
          type: 'credit',
          action: 'tip',
          description: `Tip for order #${orderId}`,
        },
      });

      await this.prisma.driver.update({
        where: { id: driverId },
        data: { walletBalance: { increment: tipAmount } },
      });
    }

    // Update order with provider share
    await this.prisma.order.update({
      where: { id: orderId },
      data: { providerShare: platformCommission + fleetCommission },
    });
  }

  /**
   * Get payment status from SkipCash
   */
  async getPaymentStatus(paymentId: string): Promise<{ status: string; paid: boolean }> {
    if (!this.keyId || !this.secretKey) {
      // Simulation mode - assume paid
      return { status: 'simulated', paid: true };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.generateSignature({ KeyId: this.keyId }),
        },
      });

      const data = await response.json();

      if (data.resultObj) {
        return {
          status: data.resultObj.status,
          paid: data.resultObj.status === 'paid' || data.resultObj.statusId === 2,
        };
      }

      return { status: 'unknown', paid: false };
    } catch (error) {
      this.logger.error(`Failed to get payment status: ${error.message}`);
      return { status: 'error', paid: false };
    }
  }
}
