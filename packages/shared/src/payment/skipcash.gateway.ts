import { BasePaymentGateway } from './payment-gateway.interface';
import {
  ChargeRequest,
  ChargeResponse,
  RefundRequest,
  RefundResponse,
  SaveCardRequest,
  SaveCardResponse,
  ValidateCardRequest,
  ValidateCardResponse,
  PaymentCard,
  PaymentStatus,
} from './types';

/**
 * SkipCash Payment Gateway Configuration
 */
export interface SkipCashConfig {
  apiKey: string;
  secretKey: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
  webhookSecret?: string;
}

/**
 * SkipCash Payment Gateway
 * Production payment provider for Qatar
 *
 * API Documentation: https://docs.skipcash.com (placeholder)
 *
 * Note: This is a placeholder implementation.
 * Actual integration requires SkipCash API credentials and documentation.
 */
export class SkipCashGateway extends BasePaymentGateway {
  readonly name = 'skipcash';
  readonly supportsCardSaving = true;
  readonly supportsRefunds = true;

  private config: SkipCashConfig;
  private baseUrl: string;

  constructor(config: SkipCashConfig) {
    super();
    this.config = config;
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.skipcash.com/v1'
        : 'https://sandbox-api.skipcash.com/v1';
  }

  async validateCard(request: ValidateCardRequest): Promise<ValidateCardResponse> {
    // TODO: Implement actual SkipCash card tokenization
    // This would typically involve:
    // 1. Sending card details to SkipCash
    // 2. Receiving a token back for future use
    // 3. SkipCash handles PCI compliance

    throw new Error('SkipCash integration not implemented. Please use FakePaymentGateway for development.');
  }

  async saveCard(request: SaveCardRequest): Promise<SaveCardResponse> {
    // TODO: Implement SkipCash card storage
    // Typically involves linking token to customer profile

    throw new Error('SkipCash integration not implemented. Please use FakePaymentGateway for development.');
  }

  async getCustomerCards(customerId: number): Promise<PaymentCard[]> {
    // TODO: Fetch saved cards from SkipCash

    throw new Error('SkipCash integration not implemented. Please use FakePaymentGateway for development.');
  }

  async deleteCard(customerId: number, cardId: string): Promise<boolean> {
    // TODO: Delete card from SkipCash

    throw new Error('SkipCash integration not implemented. Please use FakePaymentGateway for development.');
  }

  async charge(request: ChargeRequest): Promise<ChargeResponse> {
    // TODO: Implement actual SkipCash charge
    // This would typically involve:
    // 1. Creating a payment request with SkipCash
    // 2. Handling redirect flow if 3DS is required
    // 3. Processing webhook callback for completion

    throw new Error('SkipCash integration not implemented. Please use FakePaymentGateway for development.');
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    // TODO: Implement SkipCash refund

    throw new Error('SkipCash integration not implemented. Please use FakePaymentGateway for development.');
  }

  async getTransactionStatus(transactionId: string): Promise<ChargeResponse> {
    // TODO: Query SkipCash for transaction status

    throw new Error('SkipCash integration not implemented. Please use FakePaymentGateway for development.');
  }

  verifyWebhook(payload: any, signature: string): boolean {
    // TODO: Implement SkipCash webhook signature verification
    // This typically involves HMAC verification using the webhook secret

    if (!this.config.webhookSecret) {
      return false;
    }

    // Placeholder for actual verification logic
    // const expectedSignature = createHmac('sha256', this.config.webhookSecret)
    //   .update(JSON.stringify(payload))
    //   .digest('hex');
    // return signature === expectedSignature;

    return false;
  }

  /**
   * SkipCash-specific: Create a payment link for hosted checkout
   */
  async createPaymentLink(params: {
    amount: number;
    currency: string;
    orderId: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{
    success: boolean;
    paymentUrl?: string;
    paymentId?: string;
    message?: string;
  }> {
    // TODO: Implement SkipCash payment link creation
    // This is useful for redirecting users to SkipCash's hosted payment page

    throw new Error('SkipCash integration not implemented. Please use FakePaymentGateway for development.');
  }

  /**
   * SkipCash-specific: Handle webhook event
   */
  async handleWebhookEvent(event: {
    type: string;
    paymentId: string;
    status: string;
    data: any;
  }): Promise<{
    success: boolean;
    transactionId?: string;
    status?: PaymentStatus;
  }> {
    // TODO: Handle different webhook event types:
    // - payment.completed
    // - payment.failed
    // - refund.completed
    // - etc.

    throw new Error('SkipCash integration not implemented. Please use FakePaymentGateway for development.');
  }
}

/**
 * SkipCash Webhook Event Types
 */
export enum SkipCashWebhookEvent {
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
  REFUND_CREATED = 'refund.created',
  REFUND_COMPLETED = 'refund.completed',
  REFUND_FAILED = 'refund.failed',
}

/**
 * SkipCash Error Codes
 */
export enum SkipCashErrorCode {
  INVALID_CARD = 'invalid_card',
  CARD_DECLINED = 'card_declined',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  EXPIRED_CARD = 'expired_card',
  PROCESSING_ERROR = 'processing_error',
  INVALID_AMOUNT = 'invalid_amount',
  DUPLICATE_TRANSACTION = 'duplicate_transaction',
  AUTHENTICATION_FAILED = 'authentication_failed',
  MERCHANT_NOT_FOUND = 'merchant_not_found',
}
