// Payment Types and Interfaces

export enum PaymentMethod {
  CASH = 'cash',
  WALLET = 'wallet',
  CARD = 'card',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum TransactionType {
  PAYMENT = 'payment',
  TOPUP = 'topup',
  REFUND = 'refund',
  WITHDRAWAL = 'withdrawal',
  COMMISSION = 'commission',
  ADJUSTMENT = 'adjustment',
}

export interface PaymentCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  isDefault: boolean;
}

export interface ChargeRequest {
  amount: number;
  currency: string;
  customerId: number;
  orderId?: number;
  paymentMethodId?: string; // For saved cards
  cardToken?: string; // For new cards
  description?: string;
  metadata?: Record<string, any>;
}

export interface ChargeResponse {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  message?: string;
  errorCode?: string;
  gatewayResponse?: any;
}

export interface RefundRequest {
  transactionId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: PaymentStatus;
  message?: string;
  errorCode?: string;
}

export interface SaveCardRequest {
  customerId: number;
  cardToken: string;
  setAsDefault?: boolean;
}

export interface SaveCardResponse {
  success: boolean;
  card?: PaymentCard;
  message?: string;
  errorCode?: string;
}

export interface ValidateCardRequest {
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  holderName: string;
}

export interface ValidateCardResponse {
  success: boolean;
  cardToken?: string;
  last4?: string;
  brand?: string;
  message?: string;
  errorCode?: string;
}

export interface WalletTopupRequest {
  customerId: number;
  amount: number;
  currency: string;
  paymentMethodId?: string;
  cardToken?: string;
}

export interface WalletTopupResponse {
  success: boolean;
  transactionId: string;
  newBalance: number;
  amount: number;
  message?: string;
  errorCode?: string;
}

export interface WithdrawalRequest {
  driverId: number;
  amount: number;
  currency: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}

export interface WithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedArrival?: Date;
  message?: string;
}

export interface CommissionCalculation {
  orderAmount: number;
  platformCommissionRate: number;
  platformCommission: number;
  fleetCommissionRate: number;
  fleetCommission: number;
  driverEarnings: number;
  tipAmount: number;
  totalDriverPayout: number;
}
