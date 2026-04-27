import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionType, TransactionAction, PaymentGatewayType } from 'database';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly RIDER_API_URL = process.env.RIDER_API_URL || 'http://localhost:3001';
  private readonly INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  // =====================
  // Payment Gateways
  // =====================

  async getPaymentGateways() {
    const gateways = await this.prisma.paymentGateway.findMany({
      where: { deletedAt: null },
      include: { media: true },
      orderBy: { id: 'asc' },
    });

    return gateways.map((g) => ({
      id: g.id,
      type: g.type,
      title: g.title,
      description: g.description,
      isEnabled: g.isEnabled,
      mediaUrl: g.media?.address,
      createdAt: g.createdAt,
    }));
  }

  async createPaymentGateway(data: {
    type: PaymentGatewayType;
    title: string;
    description?: string;
    publicKey?: string;
    privateKey: string;
    merchantId?: string;
    saltKey?: string;
    mediaId?: number;
    isEnabled?: boolean;
  }) {
    const gateway = await this.prisma.paymentGateway.create({
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        publicKey: data.publicKey,
        privateKey: data.privateKey,
        merchantId: data.merchantId,
        saltKey: data.saltKey,
        mediaId: data.mediaId,
        isEnabled: data.isEnabled ?? true,
      },
    });

    return gateway;
  }

  async updatePaymentGateway(
    id: number,
    data: {
      title?: string;
      description?: string;
      publicKey?: string;
      privateKey?: string;
      merchantId?: string;
      saltKey?: string;
      mediaId?: number;
      isEnabled?: boolean;
    },
  ) {
    const gateway = await this.prisma.paymentGateway.findUnique({
      where: { id },
    });

    if (!gateway) {
      throw new NotFoundException('Payment gateway not found');
    }

    return this.prisma.paymentGateway.update({
      where: { id },
      data,
    });
  }

  async deletePaymentGateway(id: number) {
    const gateway = await this.prisma.paymentGateway.findUnique({
      where: { id },
    });

    if (!gateway) {
      throw new NotFoundException('Payment gateway not found');
    }

    await this.prisma.paymentGateway.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  // =====================
  // Transactions
  // =====================

  async getCustomerTransactions(
    page = 1,
    limit = 20,
    filters?: {
      customerId?: number;
      type?: TransactionType;
      action?: TransactionAction;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.type) where.type = filters.type;
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.customerTransaction.findMany({
        where,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, mobileNumber: true },
          },
          order: {
            select: { id: true, pickupAddress: true, dropoffAddress: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customerTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        action: t.action,
        amount: Number(t.amount),
        currency: t.currency,
        description: t.description,
        customer: t.customer,
        order: t.order,
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDriverTransactions(
    page = 1,
    limit = 20,
    filters?: {
      driverId?: number;
      type?: TransactionType;
      action?: TransactionAction;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.driverId) where.driverId = filters.driverId;
    if (filters?.type) where.type = filters.type;
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.driverTransaction.findMany({
        where,
        include: {
          driver: {
            select: { id: true, firstName: true, lastName: true, mobileNumber: true },
          },
          order: {
            select: { id: true, pickupAddress: true, dropoffAddress: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.driverTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        action: t.action,
        amount: Number(t.amount),
        currency: t.currency,
        description: t.description,
        driver: t.driver,
        order: t.order,
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =====================
  // Wallet Adjustments
  // =====================

  async adjustCustomerWallet(
    customerId: number,
    amount: number,
    description: string,
    operatorId: number,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const type = amount >= 0 ? TransactionType.credit : TransactionType.debit;
    const absAmount = Math.abs(amount);

    const transaction = await this.prisma.customerTransaction.create({
      data: {
        customerId,
        amount: absAmount,
        currency: 'USD',
        type,
        action: TransactionAction.adjustment,
        description: `Admin adjustment: ${description}`,
      },
    });

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        walletBalance:
          amount >= 0 ? { increment: absAmount } : { decrement: absAmount },
      },
    });

    const updatedCustomer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { walletBalance: true },
    });

    return {
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        description: transaction.description,
      },
      newBalance: Number(updatedCustomer?.walletBalance || 0),
    };
  }

  async adjustDriverWallet(
    driverId: number,
    amount: number,
    description: string,
    operatorId: number,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const type = amount >= 0 ? TransactionType.credit : TransactionType.debit;
    const absAmount = Math.abs(amount);

    const transaction = await this.prisma.driverTransaction.create({
      data: {
        driverId,
        amount: absAmount,
        currency: 'USD',
        type,
        action: TransactionAction.adjustment,
        description: `Admin adjustment: ${description}`,
      },
    });

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        walletBalance:
          amount >= 0 ? { increment: absAmount } : { decrement: absAmount },
      },
    });

    const updatedDriver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { walletBalance: true },
    });

    return {
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        description: transaction.description,
      },
      newBalance: Number(updatedDriver?.walletBalance || 0),
    };
  }

  // =====================
  // Refunds
  // =====================

  /**
   * Refund an order.
   * - If paid via SkipCash (paymentMode=payment_gateway and paymentGatewayRef exists):
   *   triggers an asynchronous gateway refund. The customer's CARD is credited (~1 day).
   *   The customer transaction is recorded by the rider-api webhook handler when SkipCash
   *   confirms (StatusId=6). Wallet balance is NOT touched.
   * - Otherwise (cash, wallet, etc): credits the customer's in-app wallet immediately.
   */
  async processRefund(
    orderId: number,
    amount: number,
    reason: string,
    operatorId: number,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const maxRefund = Number(order.paidAmount || order.costAfterCoupon || 0);
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }
    if (amount > maxRefund) {
      throw new BadRequestException(
        `Refund amount cannot exceed paid amount (${maxRefund.toFixed(2)})`,
      );
    }

    const isGatewayPaid =
      order.paymentMode === 'payment_gateway' && !!order.paymentGatewayRef;

    if (isGatewayPaid) {
      return this.processGatewayRefund(order, amount, reason, operatorId);
    }

    return this.processWalletRefund(order, amount, reason);
  }

  private async processGatewayRefund(
    order: any,
    amount: number,
    reason: string,
    operatorId: number,
  ) {
    if (!this.INTERNAL_API_KEY) {
      throw new BadRequestException(
        'INTERNAL_API_KEY not configured — cannot trigger gateway refund',
      );
    }

    let result: { success: boolean; refundId?: string; error?: string };
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.RIDER_API_URL}/api/internal/skipcash/refund`,
          { paymentId: order.paymentGatewayRef, amount },
          { headers: { 'X-Internal-Key': this.INTERNAL_API_KEY } },
        ),
      );
      result = response.data;
    } catch (err: any) {
      this.logger.error(
        `Failed to call rider-api refund for order #${order.id}: ${err.message}`,
      );
      throw new BadRequestException(
        err.response?.data?.message || `Refund call failed: ${err.message}`,
      );
    }

    if (!result.success) {
      throw new BadRequestException(result.error || 'Gateway refund failed');
    }

    await this.prisma.orderActivity.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `Refund initiated by operator #${operatorId}: ${amount.toFixed(2)} ${order.currency} — ${reason} (refundId=${result.refundId})`,
      },
    });

    return {
      type: 'gateway_refund',
      status: 'pending',
      refundId: result.refundId,
      amount,
      message:
        'Refund initiated. SkipCash will process within ~1 day; the customer transaction will be recorded automatically when confirmed.',
    };
  }

  private async processWalletRefund(order: any, amount: number, reason: string) {
    const transaction = await this.prisma.customerTransaction.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        amount,
        currency: order.currency || 'QAR',
        type: TransactionType.credit,
        action: TransactionAction.refund,
        description: `Refund for order #${order.id}: ${reason}`,
      },
    });

    await this.prisma.customer.update({
      where: { id: order.customerId },
      data: { walletBalance: { increment: amount } },
    });

    const customer = await this.prisma.customer.findUnique({
      where: { id: order.customerId },
      select: { walletBalance: true },
    });

    return {
      type: 'wallet_refund',
      transaction: {
        id: transaction.id,
        amount: Number(transaction.amount),
        description: transaction.description,
      },
      customerNewBalance: Number(customer?.walletBalance || 0),
    };
  }

  // =====================
  // Reports
  // =====================

  async getPaymentStats(startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = startDate;
      if (endDate) dateFilter.createdAt.lte = endDate;
    }

    const [customerCredits, customerDebits, driverCredits, driverDebits] =
      await Promise.all([
        this.prisma.customerTransaction.aggregate({
          where: { ...dateFilter, type: TransactionType.credit },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.customerTransaction.aggregate({
          where: { ...dateFilter, type: TransactionType.debit },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.driverTransaction.aggregate({
          where: { ...dateFilter, type: TransactionType.credit },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.driverTransaction.aggregate({
          where: { ...dateFilter, type: TransactionType.debit },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    return {
      customerTransactions: {
        totalCredits: Number(customerCredits._sum.amount || 0),
        creditsCount: customerCredits._count,
        totalDebits: Number(customerDebits._sum.amount || 0),
        debitsCount: customerDebits._count,
      },
      driverTransactions: {
        totalCredits: Number(driverCredits._sum.amount || 0),
        creditsCount: driverCredits._count,
        totalDebits: Number(driverDebits._sum.amount || 0),
        debitsCount: driverDebits._count,
      },
    };
  }

  async getCommissionReport(startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = startDate;
      if (endDate) dateFilter.createdAt.lte = endDate;
    }

    const commissions = await this.prisma.driverTransaction.aggregate({
      where: {
        ...dateFilter,
        action: TransactionAction.commission,
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalCommission: Number(commissions._sum.amount || 0),
      transactionCount: commissions._count,
    };
  }
}
