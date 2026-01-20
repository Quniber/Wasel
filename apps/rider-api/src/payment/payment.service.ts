import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TransactionType, TransactionAction, PaymentGatewayType } from 'database';

// Payment types (embedded to avoid external package dependency issues)
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

export interface PaymentCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  isDefault: boolean;
}

@Injectable()
export class PaymentService {
  // In-memory storage for fake payment gateway
  private savedCards: Map<number, PaymentCard[]> = new Map();
  private transactions: Map<string, any> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // =====================
  // Card Management
  // =====================

  async validateCard(cardData: {
    cardNumber: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    holderName: string;
  }) {
    const { cardNumber, expiryMonth, expiryYear, cvv, holderName } = cardData;

    // Validate card number using Luhn algorithm
    if (!this.validateCardNumber(cardNumber)) {
      throw new BadRequestException('Invalid card number');
    }

    // Check if card is expired
    if (this.isCardExpired(expiryMonth, expiryYear)) {
      throw new BadRequestException('Card is expired');
    }

    // Validate CVV
    if (!/^\d{3,4}$/.test(cvv)) {
      throw new BadRequestException('Invalid CVV');
    }

    // Generate token
    const cardToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const last4 = cardNumber.slice(-4);
    const brand = this.detectCardBrand(cardNumber);

    return {
      success: true,
      cardToken,
      last4,
      brand,
    };
  }

  async saveCard(customerId: number, cardToken: string, setAsDefault = false) {
    if (!cardToken || !cardToken.startsWith('tok_')) {
      throw new BadRequestException('Invalid card token');
    }

    // Get or create card payment gateway (stripe is used for card payments)
    let cardGateway = await this.prisma.paymentGateway.findFirst({
      where: {
        type: { in: [PaymentGatewayType.stripe, PaymentGatewayType.paypal] },
        isEnabled: true,
      },
    });

    if (!cardGateway) {
      // Create a default stripe gateway if none exists
      cardGateway = await this.prisma.paymentGateway.create({
        data: {
          type: PaymentGatewayType.stripe,
          title: 'Card Payment',
          privateKey: 'fake_private_key',
          isEnabled: true,
        },
      });
    }

    const card: PaymentCard = {
      id: `card_${Date.now()}`,
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2028,
      holderName: 'Test User',
      isDefault: setAsDefault,
    };

    // Save to database
    const savedMethod = await this.prisma.savedPaymentMethod.create({
      data: {
        customerId,
        paymentGatewayId: cardGateway.id,
        title: `${card.brand.toUpperCase()} •••• ${card.last4}`,
        lastFour: card.last4,
        providerBrand: card.brand,
        token: JSON.stringify({
          cardToken,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
        }),
        isDefault: setAsDefault,
      },
    });

    // If setting as default, unset others
    if (setAsDefault) {
      await this.prisma.savedPaymentMethod.updateMany({
        where: { customerId, id: { not: savedMethod.id } },
        data: { isDefault: false },
      });
    }

    return {
      ...card,
      id: savedMethod.id.toString(),
    };
  }

  async getCustomerCards(customerId: number) {
    // Fetch from database - card payment gateways only (stripe, paypal, etc.)
    const savedMethods = await this.prisma.savedPaymentMethod.findMany({
      where: {
        customerId,
        paymentGateway: {
          type: { in: [PaymentGatewayType.stripe, PaymentGatewayType.paypal] },
        },
      },
      include: { paymentGateway: true },
      orderBy: { createdAt: 'desc' },
    });

    return savedMethods.map((m) => {
      let tokenData: any = {};
      try {
        tokenData = JSON.parse(m.token);
      } catch {}

      return {
        id: m.id,
        last4: m.lastFour || '****',
        brand: m.providerBrand || 'unknown',
        expiryMonth: tokenData.expiryMonth || 12,
        expiryYear: tokenData.expiryYear || 2028,
        title: m.title,
        isDefault: m.isDefault,
      };
    });
  }

  async deleteCard(customerId: number, cardId: number) {
    const card = await this.prisma.savedPaymentMethod.findFirst({
      where: { id: cardId, customerId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.prisma.savedPaymentMethod.delete({
      where: { id: cardId },
    });

    // If deleted card was default, make another one default
    if (card.isDefault) {
      const remainingCard = await this.prisma.savedPaymentMethod.findFirst({
        where: {
          customerId,
          paymentGateway: {
            type: { in: [PaymentGatewayType.stripe, PaymentGatewayType.paypal] },
          },
        },
      });
      if (remainingCard) {
        await this.prisma.savedPaymentMethod.update({
          where: { id: remainingCard.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true };
  }

  // =====================
  // Wallet Operations
  // =====================

  async topUpWallet(
    customerId: number,
    amount: number,
    paymentMethodId?: number,
    cardToken?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    if (amount > 1000) {
      throw new BadRequestException('Maximum top-up amount is $1000');
    }

    // Simulate payment processing
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Simulate random failure (5%)
    if (Math.random() < 0.05) {
      throw new BadRequestException('Payment processing failed. Please try again.');
    }

    // Create wallet transaction
    const transaction = await this.prisma.customerTransaction.create({
      data: {
        customerId,
        type: TransactionType.credit,
        action: TransactionAction.topup,
        amount,
        description: `Wallet top-up via ${paymentMethodId ? 'saved card' : 'new card'}`,
      },
    });

    // Update wallet balance
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        walletBalance: { increment: amount },
      },
      select: { walletBalance: true },
    });

    // Store transaction reference
    this.transactions.set(transactionId, {
      transactionId,
      customerId,
      amount,
      status: PaymentStatus.COMPLETED,
    });

    return {
      success: true,
      transactionId,
      amount,
      newBalance: Number(customer.walletBalance),
    };
  }

  // =====================
  // Order Payment
  // =====================

  async processOrderPayment(
    customerId: number,
    orderId: number,
    amount: number,
    paymentMethod: PaymentMethod,
    paymentMethodId?: number,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, status: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customerId) {
      throw new BadRequestException('Order does not belong to this customer');
    }

    switch (paymentMethod) {
      case PaymentMethod.CASH:
        return this.processCashPayment(customerId, orderId, amount);

      case PaymentMethod.WALLET:
        return this.processWalletPayment(customerId, orderId, amount);

      case PaymentMethod.CARD:
        return this.processCardPayment(customerId, orderId, amount, paymentMethodId);

      default:
        throw new BadRequestException('Invalid payment method');
    }
  }

  private async processCashPayment(customerId: number, orderId: number, amount: number) {
    // Cash payment - no actual payment processing needed
    // Just record the transaction
    await this.prisma.customerTransaction.create({
      data: {
        customerId,
        orderId,
        type: TransactionType.debit,
        action: TransactionAction.ride_payment,
        amount,
        description: `Cash payment for order #${orderId}`,
      },
    });

    return {
      success: true,
      paymentMethod: PaymentMethod.CASH,
      amount,
      message: 'Please pay the driver in cash',
    };
  }

  private async processWalletPayment(customerId: number, orderId: number, amount: number) {
    // Check wallet balance
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { walletBalance: true },
    });

    if (!customer || Number(customer.walletBalance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Deduct from wallet
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: { decrement: amount } },
      }),
      this.prisma.customerTransaction.create({
        data: {
          customerId,
          orderId,
          type: TransactionType.debit,
          action: TransactionAction.ride_payment,
          amount,
          description: `Wallet payment for order #${orderId}`,
        },
      }),
    ]);

    const updatedCustomer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { walletBalance: true },
    });

    return {
      success: true,
      paymentMethod: PaymentMethod.WALLET,
      amount,
      newBalance: Number(updatedCustomer?.walletBalance || 0),
    };
  }

  private async processCardPayment(
    customerId: number,
    orderId: number,
    amount: number,
    paymentMethodId?: number,
  ) {
    // Simulate card payment processing
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulate random failure (5%)
    if (Math.random() < 0.05) {
      throw new BadRequestException('Card payment failed. Please try again.');
    }

    // Record transaction
    await this.prisma.customerTransaction.create({
      data: {
        customerId,
        orderId,
        type: TransactionType.debit,
        action: TransactionAction.ride_payment,
        amount,
        description: `Card payment for order #${orderId}`,
      },
    });

    return {
      success: true,
      paymentMethod: PaymentMethod.CARD,
      transactionId,
      amount,
    };
  }

  // =====================
  // Post-Ride Payment Retry
  // =====================

  async processPostRidePayment(customerId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        driverId: true,
        status: true,
        paymentMode: true,
        costAfterCoupon: true,
        costBest: true,
        tipAmount: true,
        currency: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
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

    // Process payment based on the order's payment mode
    let paymentResult: any;

    if (order.paymentMode === 'wallet') {
      // Check wallet balance
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { walletBalance: true },
      });

      if (!customer || Number(customer.walletBalance) < totalAmount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      // Deduct from wallet
      await this.prisma.$transaction([
        this.prisma.customer.update({
          where: { id: customerId },
          data: { walletBalance: { decrement: totalAmount } },
        }),
        this.prisma.customerTransaction.create({
          data: {
            customerId,
            orderId,
            type: TransactionType.debit,
            action: TransactionAction.ride_payment,
            amount: totalAmount,
            description: `Wallet payment for order #${orderId}`,
          },
        }),
      ]);

      paymentResult = {
        success: true,
        paymentMethod: PaymentMethod.WALLET,
        amount: totalAmount,
      };
    } else if (order.paymentMode === 'saved_payment_method' || order.paymentMode === 'payment_gateway') {
      // Card payment requires SkipCash payment link
      // Get customer details for SkipCash
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { firstName: true, lastName: true, email: true, mobileNumber: true },
      });

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }

      // Return payment link info - rider app should redirect to SkipCash
      // The actual payment completion will be handled via webhook
      return {
        success: false,
        requiresRedirect: true,
        paymentMethod: PaymentMethod.CARD,
        amount: totalAmount,
        message: 'Card payment requires redirect to payment gateway. Use /skipcash/create-payment endpoint.',
      };
    } else {
      throw new BadRequestException('Cash orders cannot be paid online');
    }

    // Update order status to Finished and record payment
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'Finished',
        finishedAt: new Date(),
        paidAmount: totalAmount,
      },
    });

    // Create order activity for audit
    await this.prisma.orderActivity.create({
      data: {
        orderId,
        status: 'Finished',
        note: `Post-ride payment completed via ${order.paymentMode}`,
      },
    });

    // Credit driver earnings (if driver exists)
    if (order.driverId) {
      await this.creditDriverEarnings(order.driverId, orderId, amount, tipAmount);
    }

    return {
      ...paymentResult,
      orderId,
      orderStatus: 'Finished',
    };
  }

  private async creditDriverEarnings(driverId: number, orderId: number, amount: number, tipAmount: number) {
    // Get platform commission rate from settings
    const commissionSetting = await this.prisma.setting.findFirst({
      where: { key: 'platform_commission_rate' },
    });
    const platformCommissionRate = commissionSetting
      ? parseFloat(commissionSetting.value)
      : 20;

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
        type: TransactionType.credit,
        action: TransactionAction.ride_earning,
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
          type: TransactionType.credit,
          action: TransactionAction.tip,
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

  // =====================
  // Refunds
  // =====================

  async processRefund(customerId: number, orderId: number, amount: number, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, costAfterCoupon: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customerId) {
      throw new BadRequestException('Order does not belong to this customer');
    }

    // Refund to wallet
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: { increment: amount } },
      }),
      this.prisma.customerTransaction.create({
        data: {
          customerId,
          orderId,
          type: TransactionType.credit,
          action: TransactionAction.refund,
          amount,
          description: reason || `Refund for order #${orderId}`,
        },
      }),
    ]);

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { walletBalance: true },
    });

    return {
      success: true,
      refundAmount: amount,
      newBalance: Number(customer?.walletBalance || 0),
    };
  }

  // =====================
  // Payment Methods List
  // =====================

  async getAvailablePaymentMethods(customerId: number) {
    const savedCards = await this.getCustomerCards(customerId);
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { walletBalance: true },
    });

    return {
      methods: [
        {
          type: PaymentMethod.CASH,
          title: 'Cash',
          description: 'Pay driver in cash',
          available: true,
        },
        {
          type: PaymentMethod.WALLET,
          title: 'Wallet',
          description: `Balance: $${Number(customer?.walletBalance || 0).toFixed(2)}`,
          available: true,
          balance: Number(customer?.walletBalance || 0),
        },
        ...savedCards.map((card) => ({
          type: PaymentMethod.CARD,
          id: card.id,
          title: card.title,
          description: `Expires ${card.expiryMonth}/${card.expiryYear}`,
          available: true,
          isDefault: card.isDefault,
        })),
      ],
    };
  }

  // =====================
  // Helper Methods
  // =====================

  private validateCardNumber(cardNumber: string): boolean {
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

  private detectCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\s/g, '');
    if (/^4/.test(number)) return 'visa';
    if (/^5[1-5]/.test(number)) return 'mastercard';
    if (/^3[47]/.test(number)) return 'amex';
    if (/^6(?:011|5)/.test(number)) return 'discover';
    return 'unknown';
  }

  private isCardExpired(expiryMonth: number, expiryYear: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const fullYear = expiryYear < 100 ? 2000 + expiryYear : expiryYear;

    if (fullYear < currentYear) return true;
    if (fullYear === currentYear && expiryMonth < currentMonth) return true;
    return false;
  }
}
