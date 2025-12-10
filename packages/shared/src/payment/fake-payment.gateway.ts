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
 * Fake Payment Gateway for development and testing
 * Simulates card validation, charges, and refunds
 */
export class FakePaymentGateway extends BasePaymentGateway {
  readonly name = 'fake';
  readonly supportsCardSaving = true;
  readonly supportsRefunds = true;

  // In-memory storage for fake data
  private savedCards: Map<number, PaymentCard[]> = new Map();
  private transactions: Map<string, ChargeResponse> = new Map();

  // Test card numbers for different scenarios
  private readonly TEST_CARDS = {
    SUCCESS: '4242424242424242', // Always succeeds
    DECLINE: '4000000000000002', // Always declines
    INSUFFICIENT: '4000000000009995', // Insufficient funds
    EXPIRED: '4000000000000069', // Expired card
    PROCESSING_ERROR: '4000000000000119', // Processing error
  };

  async validateCard(request: ValidateCardRequest): Promise<ValidateCardResponse> {
    const { cardNumber, expiryMonth, expiryYear, cvv, holderName } = request;

    // Validate card number format
    if (!this.validateCardNumber(cardNumber)) {
      return {
        success: false,
        message: 'Invalid card number',
        errorCode: 'INVALID_CARD_NUMBER',
      };
    }

    // Check if card is expired
    if (this.isCardExpired(expiryMonth, expiryYear)) {
      return {
        success: false,
        message: 'Card is expired',
        errorCode: 'CARD_EXPIRED',
      };
    }

    // Validate CVV format
    if (!/^\d{3,4}$/.test(cvv)) {
      return {
        success: false,
        message: 'Invalid CVV',
        errorCode: 'INVALID_CVV',
      };
    }

    // Check for test card that should fail validation
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber === this.TEST_CARDS.EXPIRED) {
      return {
        success: false,
        message: 'Card is expired',
        errorCode: 'CARD_EXPIRED',
      };
    }

    // Generate token for valid cards
    const cardToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const last4 = cardNumber.slice(-4);
    const brand = this.detectCardBrand(cardNumber);

    return {
      success: true,
      cardToken,
      last4,
      brand,
      message: 'Card validated successfully',
    };
  }

  async saveCard(request: SaveCardRequest): Promise<SaveCardResponse> {
    const { customerId, cardToken, setAsDefault } = request;

    // Simulate token validation
    if (!cardToken || !cardToken.startsWith('tok_')) {
      return {
        success: false,
        message: 'Invalid card token',
        errorCode: 'INVALID_TOKEN',
      };
    }

    // Create card from token (in real implementation, this would fetch from payment provider)
    const cardId = `card_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const card: PaymentCard = {
      id: cardId,
      last4: '4242', // Would come from token data
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2028,
      holderName: 'Test User',
      isDefault: setAsDefault || false,
    };

    // Save to memory
    const customerCards = this.savedCards.get(customerId) || [];

    // If setting as default, unset others
    if (setAsDefault) {
      customerCards.forEach((c) => (c.isDefault = false));
    }

    // If first card, make it default
    if (customerCards.length === 0) {
      card.isDefault = true;
    }

    customerCards.push(card);
    this.savedCards.set(customerId, customerCards);

    return {
      success: true,
      card,
      message: 'Card saved successfully',
    };
  }

  async getCustomerCards(customerId: number): Promise<PaymentCard[]> {
    return this.savedCards.get(customerId) || [];
  }

  async deleteCard(customerId: number, cardId: string): Promise<boolean> {
    const customerCards = this.savedCards.get(customerId);
    if (!customerCards) return false;

    const index = customerCards.findIndex((c) => c.id === cardId);
    if (index === -1) return false;

    const wasDefault = customerCards[index].isDefault;
    customerCards.splice(index, 1);

    // If deleted card was default, make first remaining card default
    if (wasDefault && customerCards.length > 0) {
      customerCards[0].isDefault = true;
    }

    this.savedCards.set(customerId, customerCards);
    return true;
  }

  async charge(request: ChargeRequest): Promise<ChargeResponse> {
    const { amount, currency, customerId, orderId, paymentMethodId, description } = request;

    const transactionId = this.generateTransactionId();

    // Simulate processing delay
    await this.simulateDelay(500, 1500);

    // Check for test scenarios based on amount
    if (amount === 0) {
      return this.createFailedResponse(transactionId, amount, currency, 'INVALID_AMOUNT', 'Amount must be greater than 0');
    }

    // Simulate random failures for testing (5% failure rate)
    if (Math.random() < 0.05) {
      return this.createFailedResponse(transactionId, amount, currency, 'PROCESSING_ERROR', 'Payment processing failed');
    }

    // Simulate insufficient funds for amounts over 10000
    if (amount > 10000) {
      return this.createFailedResponse(transactionId, amount, currency, 'INSUFFICIENT_FUNDS', 'Insufficient funds');
    }

    // Success response
    const response: ChargeResponse = {
      success: true,
      transactionId,
      status: PaymentStatus.COMPLETED,
      amount,
      currency,
      message: 'Payment successful',
      gatewayResponse: {
        customerId,
        orderId,
        paymentMethodId,
        description,
        processedAt: new Date().toISOString(),
      },
    };

    // Store transaction for later reference
    this.transactions.set(transactionId, response);

    return response;
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const { transactionId, amount, reason } = request;

    // Check if original transaction exists
    const originalTransaction = this.transactions.get(transactionId);
    if (!originalTransaction) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        status: PaymentStatus.FAILED,
        message: 'Original transaction not found',
        errorCode: 'TRANSACTION_NOT_FOUND',
      };
    }

    // Validate refund amount
    const refundAmount = amount || originalTransaction.amount;
    if (refundAmount > originalTransaction.amount) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        status: PaymentStatus.FAILED,
        message: 'Refund amount exceeds original transaction',
        errorCode: 'INVALID_REFUND_AMOUNT',
      };
    }

    // Simulate processing delay
    await this.simulateDelay(300, 800);

    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Update original transaction status
    originalTransaction.status = PaymentStatus.REFUNDED;
    this.transactions.set(transactionId, originalTransaction);

    return {
      success: true,
      refundId,
      amount: refundAmount,
      status: PaymentStatus.COMPLETED,
      message: `Refund processed successfully${reason ? `: ${reason}` : ''}`,
    };
  }

  async getTransactionStatus(transactionId: string): Promise<ChargeResponse> {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      return {
        success: false,
        transactionId,
        status: PaymentStatus.FAILED,
        amount: 0,
        currency: 'USD',
        message: 'Transaction not found',
        errorCode: 'TRANSACTION_NOT_FOUND',
      };
    }

    return transaction;
  }

  verifyWebhook(payload: any, signature: string): boolean {
    // In fake gateway, always return true for testing
    return signature === 'fake_webhook_signature';
  }

  /**
   * Helper to create failed response
   */
  private createFailedResponse(
    transactionId: string,
    amount: number,
    currency: string,
    errorCode: string,
    message: string,
  ): ChargeResponse {
    const response: ChargeResponse = {
      success: false,
      transactionId,
      status: PaymentStatus.FAILED,
      amount,
      currency,
      message,
      errorCode,
    };

    this.transactions.set(transactionId, response);
    return response;
  }

  /**
   * Simulate network delay
   */
  private simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Reset all stored data (useful for testing)
   */
  reset(): void {
    this.savedCards.clear();
    this.transactions.clear();
  }
}
