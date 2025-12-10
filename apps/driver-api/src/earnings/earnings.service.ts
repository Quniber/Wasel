import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, TransactionType, TransactionAction } from 'database';

@Injectable()
export class EarningsService {
  constructor(private prisma: PrismaService) {}

  // Get today's earnings
  async getTodayEarnings(driverId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        driverId,
        status: { in: [OrderStatus.Finished, OrderStatus.WaitingForReview] },
        finishedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        paidAmount: true,
        tipAmount: true,
        costBest: true,
        costAfterCoupon: true,
        finishedAt: true,
      },
    });

    const totalEarnings = orders.reduce((sum, order) => {
      const fare = Number(order.paidAmount || order.costAfterCoupon || order.costBest || 0);
      const tip = Number(order.tipAmount || 0);
      return sum + fare + tip;
    }, 0);

    const totalTips = orders.reduce((sum, order) => sum + Number(order.tipAmount || 0), 0);

    return {
      date: today.toISOString().split('T')[0],
      totalEarnings,
      totalTips,
      ridesCount: orders.length,
      orders: orders.map((o) => ({
        id: o.id,
        fare: Number(o.paidAmount || o.costAfterCoupon || o.costBest || 0),
        tip: Number(o.tipAmount || 0),
        finishedAt: o.finishedAt,
      })),
    };
  }

  // Get this week's earnings
  async getWeekEarnings(driverId: number) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const orders = await this.prisma.order.findMany({
      where: {
        driverId,
        status: { in: [OrderStatus.Finished, OrderStatus.WaitingForReview] },
        finishedAt: {
          gte: startOfWeek,
          lt: endOfWeek,
        },
      },
      select: {
        id: true,
        paidAmount: true,
        tipAmount: true,
        costBest: true,
        costAfterCoupon: true,
        finishedAt: true,
      },
    });

    const totalEarnings = orders.reduce((sum, order) => {
      const fare = Number(order.paidAmount || order.costAfterCoupon || order.costBest || 0);
      const tip = Number(order.tipAmount || 0);
      return sum + fare + tip;
    }, 0);

    const totalTips = orders.reduce((sum, order) => sum + Number(order.tipAmount || 0), 0);

    // Group by day
    const dailyEarnings: { [key: string]: { earnings: number; tips: number; rides: number } } = {};
    orders.forEach((order) => {
      const date = order.finishedAt?.toISOString().split('T')[0] || '';
      if (!dailyEarnings[date]) {
        dailyEarnings[date] = { earnings: 0, tips: 0, rides: 0 };
      }
      dailyEarnings[date].earnings += Number(order.paidAmount || order.costAfterCoupon || order.costBest || 0);
      dailyEarnings[date].tips += Number(order.tipAmount || 0);
      dailyEarnings[date].rides += 1;
    });

    return {
      weekStart: startOfWeek.toISOString().split('T')[0],
      weekEnd: new Date(endOfWeek.getTime() - 1).toISOString().split('T')[0],
      totalEarnings,
      totalTips,
      ridesCount: orders.length,
      dailyBreakdown: Object.entries(dailyEarnings).map(([date, data]) => ({
        date,
        ...data,
      })),
    };
  }

  // Get earnings history with pagination
  async getEarningsHistory(driverId: number, page = 1, limit = 20, startDate?: Date, endDate?: Date) {
    const skip = (page - 1) * limit;

    const where: any = {
      driverId,
      status: { in: [OrderStatus.Finished, OrderStatus.WaitingForReview] },
    };

    if (startDate || endDate) {
      where.finishedAt = {};
      if (startDate) where.finishedAt.gte = startDate;
      if (endDate) where.finishedAt.lte = endDate;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { finishedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          paidAmount: true,
          tipAmount: true,
          costBest: true,
          costAfterCoupon: true,
          pickupAddress: true,
          dropoffAddress: true,
          finishedAt: true,
          paymentMode: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((o) => ({
        id: o.id,
        fare: Number(o.paidAmount || o.costAfterCoupon || o.costBest || 0),
        tip: Number(o.tipAmount || 0),
        pickupAddress: o.pickupAddress,
        dropoffAddress: o.dropoffAddress,
        paymentMode: o.paymentMode,
        finishedAt: o.finishedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get wallet balance
  async getWalletBalance(driverId: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { walletBalance: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return {
      balance: Number(driver.walletBalance || 0),
    };
  }

  // Get wallet transactions
  async getWalletTransactions(driverId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.driverTransaction.findMany({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.driverTransaction.count({ where: { driverId } }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        action: t.action,
        amount: t.type === TransactionType.credit ? Number(t.amount) : -Number(t.amount),
        description: t.description,
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

  // Request withdrawal (simplified - full implementation in Phase 7)
  async requestWithdrawal(driverId: number, amount: number, bankInfo?: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { walletBalance: true, bankName: true, accountNumber: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const balance = Number(driver.walletBalance || 0);

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (amount > balance) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create withdrawal transaction
    const transaction = await this.prisma.driverTransaction.create({
      data: {
        driverId,
        amount,
        currency: 'USD',
        type: TransactionType.debit,
        action: TransactionAction.withdrawal,
        description: `Withdrawal request - ${bankInfo || 'Bank transfer'}`,
      },
    });

    // Deduct from wallet
    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        walletBalance: {
          decrement: amount,
        },
      },
    });

    return {
      id: transaction.id,
      amount,
      status: 'pending',
      message: 'Withdrawal request submitted successfully. Processing time: 1-3 business days.',
    };
  }

  // Get payout/withdrawal history
  async getPayoutHistory(driverId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.driverTransaction.findMany({
        where: {
          driverId,
          action: TransactionAction.withdrawal,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.driverTransaction.count({
        where: {
          driverId,
          action: TransactionAction.withdrawal,
        },
      }),
    ]);

    return {
      payouts: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        currency: t.currency,
        status: 'completed', // Simplified - full status tracking in Phase 7
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
}
