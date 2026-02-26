import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionType, TransactionAction } from 'database';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  // Get wallet balance
  async getBalance(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { walletBalance: true },
    });

    return {
      balance: Number(customer?.walletBalance || 0),
      currency: 'USD',
    };
  }

  // Get transaction history
  async getTransactions(customerId: number, limit = 20, offset = 0) {
    const [transactions, total] = await Promise.all([
      this.prisma.customerTransaction.findMany({
        where: { customerId },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              pickupAddress: true,
              dropoffAddress: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.customerTransaction.count({ where: { customerId } }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        action: t.action,
        amount: Number(t.amount),
        description: t.description,
        orderId: t.orderId,
        order: t.order,
        createdAt: t.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }

  // Top up wallet (simulated - in production would integrate with payment gateway)
  async topUp(customerId: number, amount: number, paymentMethodId?: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Create transaction
    const transaction = await this.prisma.customerTransaction.create({
      data: {
        customerId,
        type: TransactionType.credit,
        action: TransactionAction.topup,
        amount,
        description: `Wallet top-up`,
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

    return {
      transaction: {
        id: transaction.id,
        type: transaction.type,
        action: transaction.action,
        amount: Number(transaction.amount),
        createdAt: transaction.createdAt,
      },
      newBalance: Number(customer.walletBalance),
    };
  }

  // Get top-up options (predefined amounts)
  async getTopUpOptions() {
    return {
      options: [
        { amount: 10, label: '$10' },
        { amount: 20, label: '$20' },
        { amount: 50, label: '$50' },
        { amount: 100, label: '$100' },
      ],
      currency: 'USD',
      minAmount: 5,
      maxAmount: 500,
    };
  }
}
