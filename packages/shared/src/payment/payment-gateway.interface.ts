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
} from './types';

/**
 * Abstract Payment Gateway Interface
 * All payment providers must implement this interface
 */
export interface IPaymentGateway {
  /**
   * Gateway identifier
   */
  readonly name: string;

  /**
   * Whether the gateway supports card saving
   */
  readonly supportsCardSaving: boolean;

  /**
   * Whether the gateway supports refunds
   */
  readonly supportsRefunds: boolean;

  /**
   * Validate card details and return a token for later use
   */
  validateCard(request: ValidateCardRequest): Promise<ValidateCardResponse>;

  /**
   * Save a card for future payments
   */
  saveCard(request: SaveCardRequest): Promise<SaveCardResponse>;

  /**
   * Get saved cards for a customer
   */
  getCustomerCards(customerId: number): Promise<PaymentCard[]>;

  /**
   * Delete a saved card
   */
  deleteCard(customerId: number, cardId: string): Promise<boolean>;

  /**
   * Charge a payment
   */
  charge(request: ChargeRequest): Promise<ChargeResponse>;

  /**
   * Process a refund
   */
  refund(request: RefundRequest): Promise<RefundResponse>;

  /**
   * Check the status of a transaction
   */
  getTransactionStatus(transactionId: string): Promise<ChargeResponse>;

  /**
   * Verify webhook signature (for payment notifications)
   */
  verifyWebhook(payload: any, signature: string): boolean;
}

/**
 * Abstract base class for payment gateways
 */
export abstract class BasePaymentGateway implements IPaymentGateway {
  abstract readonly name: string;
  abstract readonly supportsCardSaving: boolean;
  abstract readonly supportsRefunds: boolean;

  abstract validateCard(request: ValidateCardRequest): Promise<ValidateCardResponse>;
  abstract saveCard(request: SaveCardRequest): Promise<SaveCardResponse>;
  abstract getCustomerCards(customerId: number): Promise<PaymentCard[]>;
  abstract deleteCard(customerId: number, cardId: string): Promise<boolean>;
  abstract charge(request: ChargeRequest): Promise<ChargeResponse>;
  abstract refund(request: RefundRequest): Promise<RefundResponse>;
  abstract getTransactionStatus(transactionId: string): Promise<ChargeResponse>;

  verifyWebhook(payload: any, signature: string): boolean {
    // Override in specific implementations
    return false;
  }

  /**
   * Generate a unique transaction ID
   */
  protected generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `txn_${timestamp}_${randomPart}`;
  }

  /**
   * Detect card brand from card number
   */
  protected detectCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\s/g, '');

    if (/^4/.test(number)) return 'visa';
    if (/^5[1-5]/.test(number)) return 'mastercard';
    if (/^3[47]/.test(number)) return 'amex';
    if (/^6(?:011|5)/.test(number)) return 'discover';
    if (/^(?:2131|1800|35)/.test(number)) return 'jcb';
    if (/^3(?:0[0-5]|[68])/.test(number)) return 'diners';

    return 'unknown';
  }

  /**
   * Validate card number using Luhn algorithm
   */
  protected validateCardNumber(cardNumber: string): boolean {
    const number = cardNumber.replace(/\s/g, '');

    if (!/^\d{13,19}$/.test(number)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Check if card is expired
   */
  protected isCardExpired(expiryMonth: number, expiryYear: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Assume 2-digit year means 20xx
    const fullYear = expiryYear < 100 ? 2000 + expiryYear : expiryYear;

    if (fullYear < currentYear) return true;
    if (fullYear === currentYear && expiryMonth < currentMonth) return true;

    return false;
  }
}
