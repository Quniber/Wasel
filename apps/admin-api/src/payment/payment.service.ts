import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, TransactionAction, PaymentGatewayType } from 'database';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

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
    if (amount > maxRefund) {
      throw new BadRequestException(
        `Refund amount cannot exceed paid amount ($${maxRefund.toFixed(2)})`,
      );
    }

    // Add refund to customer wallet
    const transaction = await this.prisma.customerTransaction.create({
      data: {
        customerId: order.customerId,
        orderId,
        amount,
        currency: 'USD',
        type: TransactionType.credit,
        action: TransactionAction.refund,
        description: `Refund for order #${orderId}: ${reason}`,
      },
    });

    await this.prisma.customer.update({
      where: { id: order.customerId },
      data: {
        walletBalance: { increment: amount },
      },
    });

    const customer = await this.prisma.customer.findUnique({
      where: { id: order.customerId },
      select: { walletBalance: true },
    });

    return {
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
