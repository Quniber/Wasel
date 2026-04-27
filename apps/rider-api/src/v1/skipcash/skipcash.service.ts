import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
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

export interface SkipCashPrePaymentRequest {
  amount: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  transactionId: string;
  customerId: number;
  orderId: number;
}

export interface SkipCashPaymentResponse {
  success: boolean;
  paymentId?: string;
  payUrl?: string;
  error?: string;
}

/**
 * SkipCash webhook payload — fields are PascalCase per the SkipCash spec.
 * StatusId values: 0=new, 1=pending, 2=paid, 3=canceled, 4=failed,
 *                  5=rejected, 6=refunded, 7=pendingrefund, 8=refundfailed
 */
export interface SkipCashWebhookPayload {
  PaymentId: string;
  Amount: string;
  StatusId: number;
  TransactionId?: string;
  Custom1?: string;
  Custom2?: string;
  Custom3?: string;
  Custom4?: string;
  Custom5?: string;
  Custom6?: string;
  Custom7?: string;
  Custom8?: string;
  Custom9?: string;
  Custom10?: string;
  VisaId?: string;
  TokenId?: string;
  CardType?: string;
  CardNubmer?: string; // sic - SkipCash spells it this way
  RecurringSubscriptionId?: string;
}

export enum SkipCashStatus {
  New = 0,
  Pending = 1,
  Paid = 2,
  Canceled = 3,
  Failed = 4,
  Rejected = 5,
  Refunded = 6,
  PendingRefund = 7,
  RefundFailed = 8,
}

@Injectable()
export class SkipCashService {
  private readonly logger = new Logger(SkipCashService.name);
  private readonly baseUrl: string;
  private readonly keyId: string;
  private readonly secretKey: string;
  private readonly webhookKey: string;
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
    this.webhookKey = this.configService.get<string>('SKIPCASH_WEBHOOK_KEY', '');
    this.webhookUrl = this.configService.get<string>('SKIPCASH_WEBHOOK_URL', '');
    this.returnUrl = this.configService.get<string>('SKIPCASH_RETURN_URL', '');

    this.logger.log(
      `SkipCash config loaded — env=${environment}, keyId=${this.keyId ? 'set' : 'MISSING'}, ` +
      `secretKey=${this.secretKey ? 'set' : 'MISSING'}, webhookKey=${this.webhookKey ? 'set' : 'MISSING'}`,
    );
  }

  /**
   * Generate HMAC-SHA256 signature for SkipCash API
   * IMPORTANT: Field order must match exactly: Uid, KeyId, Amount, FirstName, LastName, Phone, Email, TransactionId, Custom1
   * WebhookUrl and ReturnUrl are NOT included in signature
   */
  private generateSignature(params: Record<string, string>): string {
    // Build signature string - order matches SkipCash documentation
    // Only include non-empty fields
    const signatureFields: string[] = [];

    // Exact order from SkipCash PHP SDK
    if (params.Uid) signatureFields.push(`Uid=${params.Uid}`);
    if (params.KeyId) signatureFields.push(`KeyId=${params.KeyId}`);
    if (params.Amount) signatureFields.push(`Amount=${params.Amount}`);
    if (params.FirstName) signatureFields.push(`FirstName=${params.FirstName}`);
    if (params.LastName) signatureFields.push(`LastName=${params.LastName}`);
    if (params.Phone) signatureFields.push(`Phone=${params.Phone}`);
    if (params.Email) signatureFields.push(`Email=${params.Email}`);
    if (params.TransactionId) signatureFields.push(`TransactionId=${params.TransactionId}`);
    if (params.Custom1) signatureFields.push(`Custom1=${params.Custom1}`);
    // WebhookUrl and ReturnUrl are NOT signed

    const combinedData = signatureFields.join(',');

    this.logger.debug(`Signature string: ${combinedData}`);

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
      Phone: request.phone || '',
      Email: request.email,
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
          Uid: params.Uid,
          KeyId: params.KeyId,
          Amount: params.Amount,
          FirstName: params.FirstName,
          LastName: params.LastName,
          Phone: params.Phone,
          Email: params.Email,
          TransactionId: params.TransactionId,
          Custom1: params.Custom1,
          WebhookUrl: this.webhookUrl,
          ReturnUrl: this.returnUrl,
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
   * Create a pre-payment link for an order that's been pre-created with WaitingForPrePay status.
   * On webhook (StatusId=2), the webhook handler flips the order to Requested and dispatches.
   */
  async createPrePayment(request: SkipCashPrePaymentRequest): Promise<SkipCashPaymentResponse> {
    if (!this.keyId || !this.secretKey) {
      this.logger.warn('SkipCash credentials not configured, using simulation mode');
      return this.simulatePrePayment(request);
    }

    const uid = this.generateUid();
    const params: Record<string, string> = {
      Uid: uid,
      KeyId: this.keyId,
      Amount: request.amount.toFixed(2),
      FirstName: request.firstName,
      LastName: request.lastName,
      Phone: request.phone || '',
      Email: request.email,
      TransactionId: request.transactionId,
      Custom1: JSON.stringify({
        type: 'prepay',
        orderId: request.orderId,
        customerId: request.customerId,
      }),
    };

    const signature = this.generateSignature(params);

    // Debug: Log the request details
    this.logger.debug(`SkipCash Request - URL: ${this.baseUrl}/api/v1/payments`);
    this.logger.debug(`SkipCash Request - Signature: ${signature}`);

    const requestBody = {
      Uid: params.Uid,
      KeyId: params.KeyId,
      Amount: params.Amount,
      FirstName: params.FirstName,
      LastName: params.LastName,
      Phone: params.Phone,
      Email: params.Email,
      TransactionId: params.TransactionId,
      Custom1: params.Custom1,
      WebhookUrl: this.webhookUrl,
      ReturnUrl: `${this.returnUrl}?type=prepay`,
    };

    this.logger.debug(`SkipCash Request Body: ${JSON.stringify(requestBody)}`);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': signature,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      this.logger.debug(`SkipCash Response: ${JSON.stringify(data)}`);

      if (data.returnCode === 200 && data.resultObj) {
        this.logger.log(`SkipCash pre-payment created: ${data.resultObj.id}`);

        return {
          success: true,
          paymentId: data.resultObj.id,
          payUrl: data.resultObj.payUrl,
        };
      } else {
        this.logger.error(`SkipCash pre-payment failed: ${data.errorMessage}`);
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
   * Simulate pre-payment for development/testing.
   * Returns a fake payUrl pointing at our return endpoint with simulated=true so handleReturn
   * can drive the success path locally without a real SkipCash transaction.
   */
  private simulatePrePayment(request: SkipCashPrePaymentRequest): SkipCashPaymentResponse {
    const paymentId = `sim_prepay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    this.logger.log(`Simulated SkipCash pre-payment created: ${paymentId}`);

    const returnUrl =
      `${this.returnUrl}?type=prepay&simulated=true&paymentId=${paymentId}` +
      `&orderId=${request.orderId}&amount=${request.amount}`;

    return {
      success: true,
      paymentId,
      payUrl: returnUrl,
    };
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
   * Build the comma-separated key=value string SkipCash signs for webhooks.
   * Field order is fixed: PaymentId, Amount, StatusId, TransactionId, Custom1, VisaId.
   * Empty/missing fields are omitted (per SkipCash spec).
   */
  private buildWebhookSignaturePayload(payload: SkipCashWebhookPayload): string {
    const parts: string[] = [];
    if (payload.PaymentId) parts.push(`PaymentId=${payload.PaymentId}`);
    if (payload.Amount) parts.push(`Amount=${payload.Amount}`);
    if (payload.StatusId !== undefined && payload.StatusId !== null) {
      parts.push(`StatusId=${payload.StatusId}`);
    }
    if (payload.TransactionId) parts.push(`TransactionId=${payload.TransactionId}`);
    if (payload.Custom1) parts.push(`Custom1=${payload.Custom1}`);
    if (payload.VisaId) parts.push(`VisaId=${payload.VisaId}`);
    return parts.join(',');
  }

  /**
   * Verify the SkipCash webhook Authorization header.
   * Signature is HMAC-SHA256 of the comma-separated payload, using the WEBHOOK key
   * (not the secret key), encoded as base64.
   */
  verifyWebhookSignature(payload: SkipCashWebhookPayload, signature: string | undefined): boolean {
    if (!this.webhookKey) {
      this.logger.warn('SKIPCASH_WEBHOOK_KEY not configured — rejecting webhook');
      return false;
    }
    if (!signature) {
      return false;
    }

    const data = this.buildWebhookSignaturePayload(payload);
    const expected = crypto
      .createHmac('sha256', this.webhookKey)
      .update(data)
      .digest('base64');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signature);
    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }

  /**
   * Process webhook callback from SkipCash.
   * Idempotent: same payload can arrive multiple times (per SkipCash spec) and we
   * never downgrade a Finished order back to a failed/cancelled state.
   */
  async processWebhook(
    payload: SkipCashWebhookPayload,
  ): Promise<{ success: boolean; orderId?: number; shouldDispatch?: boolean }> {
    this.logger.log(
      `SkipCash webhook: PaymentId=${payload.PaymentId}, StatusId=${payload.StatusId}, ` +
      `TransactionId=${payload.TransactionId}`,
    );

    // Look up by paymentGatewayRef first (the original payment's SkipCash ID).
    // Fallback: SkipCash docs don't specify whether refund webhooks use the
    // original PaymentId or the new refundId, so we also try refundId.
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { paymentGatewayRef: payload.PaymentId },
          { refundId: payload.PaymentId },
        ],
      },
      include: { customer: true, driver: true },
    });

    if (!order) {
      this.logger.warn(`Order not found for SkipCash PaymentId=${payload.PaymentId}`);
      return { success: false };
    }

    const status = payload.StatusId as SkipCashStatus;

    switch (status) {
      case SkipCashStatus.Paid:
        return this.handlePaidEvent(order, payload);

      case SkipCashStatus.Refunded:
        return this.handleRefundedEvent(order, payload);

      case SkipCashStatus.PendingRefund:
        await this.prisma.order.update({
          where: { id: order.id },
          data: { refundStatus: 'pending' },
        });
        await this.prisma.orderActivity.create({
          data: {
            orderId: order.id,
            status: order.status,
            note: `SkipCash refund pending (${payload.PaymentId})`,
          },
        });
        return { success: true, orderId: order.id };

      case SkipCashStatus.RefundFailed:
        this.logger.error(
          `SkipCash refund FAILED for order #${order.id} (${payload.PaymentId})`,
        );
        await this.prisma.order.update({
          where: { id: order.id },
          data: { refundStatus: 'failed' },
        });
        await this.prisma.orderActivity.create({
          data: {
            orderId: order.id,
            status: order.status,
            note: `SkipCash refund FAILED (${payload.PaymentId})`,
          },
        });
        return { success: true, orderId: order.id };

      case SkipCashStatus.Failed:
      case SkipCashStatus.Rejected:
      case SkipCashStatus.Canceled:
        // Never downgrade a Finished order — multiple webhooks can arrive out of order.
        if (order.status === 'Finished') {
          this.logger.warn(
            `Ignoring StatusId=${status} for already-Finished order #${order.id}`,
          );
          return { success: true, orderId: order.id };
        }
        // Prepay never completed — release the slot so it doesn't sit forever.
        if (order.status === 'WaitingForPrePay') {
          await this.prisma.order.update({
            where: { id: order.id },
            data: { status: 'Expired' },
          });
        }
        await this.prisma.orderActivity.create({
          data: {
            orderId: order.id,
            status: order.status === 'WaitingForPrePay' ? 'Expired' : order.status,
            note: `SkipCash payment ${SkipCashStatus[status]} (${payload.PaymentId})`,
          },
        });
        return { success: true, orderId: order.id };

      default:
        // New / Pending / unknown — just acknowledge.
        return { success: true, orderId: order.id };
    }
  }

  private async handlePaidEvent(
    order: any,
    payload: SkipCashWebhookPayload,
  ): Promise<{ success: boolean; orderId: number; shouldDispatch?: boolean }> {
    // Idempotency: if already Finished, don't reprocess.
    if (order.status === 'Finished') {
      this.logger.log(`Order #${order.id} already Finished — skipping duplicate Paid webhook`);
      return { success: true, orderId: order.id };
    }

    // Decimal objects from Prisma are always truthy even at 0, so don't use ||.
    // Prefer the webhook's Amount (authoritative — it's what was actually charged),
    // then fall back to costAfterCoupon if non-zero, else costBest.
    const couponAmount = Number(order.costAfterCoupon ?? 0);
    const bestAmount = Number(order.costBest ?? 0);
    const orderAmount = couponAmount > 0 ? couponAmount : bestAmount;
    const webhookAmount = Number(payload.Amount) || 0;
    const amount = webhookAmount > 0 ? webhookAmount : orderAmount;
    const tipAmount = Number(order.tipAmount ?? 0);
    const totalAmount = amount + tipAmount;

    // POST-PAY: rider pays after the ride finishes.
    if (order.status === 'WaitingForPostPay') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'Finished',
          finishedAt: new Date(),
          paidAmount: totalAmount,
        },
      });

      await this.prisma.customerTransaction.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          type: 'debit',
          action: 'ride_payment',
          amount: totalAmount,
          description: `SkipCash payment for order #${order.id}`,
          reference: payload.PaymentId,
        },
      });

      await this.prisma.orderActivity.create({
        data: {
          orderId: order.id,
          status: 'Finished',
          note: `Payment completed via SkipCash (${payload.PaymentId})`,
        },
      });

      if (order.driverId) {
        await this.creditDriverEarnings(order.driverId, order.id, amount, tipAmount);
      }

      this.logger.log(`Order #${order.id} post-pay completed via SkipCash`);
      return { success: true, orderId: order.id };
    }

    // PRE-PAY: rider paid before the ride; flip to Requested so dispatch runs.
    if (order.status === 'WaitingForPrePay') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'Requested',
          paidAmount: totalAmount,
        },
      });

      await this.prisma.customerTransaction.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          type: 'debit',
          action: 'ride_payment',
          amount: totalAmount,
          description: `SkipCash pre-payment for order #${order.id}`,
          reference: payload.PaymentId,
        },
      });

      await this.prisma.orderActivity.create({
        data: {
          orderId: order.id,
          status: 'Requested',
          note: `Pre-payment captured via SkipCash (${payload.PaymentId}) — dispatching`,
        },
      });

      this.logger.log(`Order #${order.id} pre-pay captured — flipped to Requested`);
      return { success: true, orderId: order.id, shouldDispatch: true };
    }

    // Paid event for an order in some other state — log and acknowledge but do nothing.
    this.logger.warn(
      `Paid webhook for order #${order.id} in unexpected state ${order.status} — no-op`,
    );
    return { success: true, orderId: order.id };
  }

  private async handleRefundedEvent(
    order: any,
    payload: SkipCashWebhookPayload,
  ): Promise<{ success: boolean; orderId: number }> {
    // Was a refund we initiated already recorded? Skip duplicates.
    const existing = await this.prisma.customerTransaction.findFirst({
      where: {
        orderId: order.id,
        action: 'refund',
        reference: payload.PaymentId,
      },
    });

    if (existing) {
      this.logger.log(`Refund already recorded for order #${order.id} — skipping`);
      return { success: true, orderId: order.id };
    }

    const refundAmount = Number(payload.Amount) || Number(order.paidAmount) || 0;

    await this.prisma.customerTransaction.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        type: 'credit',
        action: 'refund',
        amount: refundAmount,
        description: `SkipCash refund for order #${order.id}`,
        reference: payload.PaymentId,
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        refundStatus: 'completed',
        refundedAt: new Date(),
        refundedAmount: refundAmount,
      },
    });

    await this.prisma.orderActivity.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `SkipCash refund completed (${payload.PaymentId}, amount ${refundAmount})`,
      },
    });

    this.logger.log(`Refund recorded for order #${order.id} (amount ${refundAmount})`);
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
   * Refund a SkipCash payment via POST /api/v1/payments/refund.
   * Per spec: HMAC signature is built from `Id={paymentId},KeyId={keyId}` (amount NOT included).
   * Refund is asynchronous — SkipCash returns a refundId immediately and processes in ~1 day,
   * sending a webhook with StatusId=6 (refunded), 7 (pending), or 8 (failed).
   */
  async refund(
    paymentId: string,
    amount?: number,
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    if (!this.keyId || !this.secretKey) {
      this.logger.warn('SkipCash credentials not configured — cannot refund');
      return { success: false, error: 'Payment gateway not configured' };
    }

    const signatureString = `Id=${paymentId},KeyId=${this.keyId}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureString)
      .digest('base64');

    const body: Record<string, string> = {
      id: paymentId,
      keyId: this.keyId,
    };
    if (amount !== undefined && amount !== null) {
      body.amount = amount.toFixed(2);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/payments/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: signature,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      this.logger.debug(`SkipCash refund response: ${JSON.stringify(data)}`);

      if (data.returnCode === 200 && data.resultObj) {
        const refundId = data.resultObj.id || data.resultObj.refundId;
        this.logger.log(`SkipCash refund created: ${refundId} for payment ${paymentId}`);
        return { success: true, refundId };
      }

      const error = data.errorMessage || 'Refund failed';
      this.logger.error(`SkipCash refund failed for ${paymentId}: ${error}`);
      return { success: false, error };
    } catch (err: any) {
      this.logger.error(`SkipCash refund API error: ${err.message}`);
      return { success: false, error: err.message };
    }
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
