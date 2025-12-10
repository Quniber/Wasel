import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, TransactionAction, PaymentMode } from 'database';

export interface CommissionConfig {
  platformCommissionRate: number;
  fleetCommissionRate?: number;
  minimumPlatformCommission?: number;
}

export interface CommissionBreakdown {
  orderAmount: number;
  platformCommissionRate: number;
  platformCommission: number;
  fleetCommissionRate: number;
  fleetCommission: number;
  driverEarnings: number;
  tipAmount: number;
  totalDriverPayout: number;
}

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate commission breakdown for an order
   */
  calculateCommission(
    orderAmount: number,
    tipAmount: number = 0,
    config: CommissionConfig = { platformCommissionRate: 20 },
  ): CommissionBreakdown {
    // Platform commission (from base fare, not tip)
    let platformCommission = (orderAmount * config.platformCommissionRate) / 100;

    // Apply minimum platform commission
    if (config.minimumPlatformCommission && platformCommission < config.minimumPlatformCommission) {
      platformCommission = config.minimumPlatformCommission;
    }

    // Ensure commission doesn't exceed order amount
    platformCommission = Math.min(platformCommission, orderAmount);

    // Fleet commission (from driver's share after platform commission)
    const afterPlatform = orderAmount - platformCommission;
    let fleetCommission = 0;

    if (config.fleetCommissionRate && config.fleetCommissionRate > 0) {
      fleetCommission = (afterPlatform * config.fleetCommissionRate) / 100;
    }

    // Driver earnings (after all commissions)
    const driverEarnings = orderAmount - platformCommission - fleetCommission;

    // Tips go 100% to driver
    const totalDriverPayout = driverEarnings + tipAmount;

    return {
      orderAmount: this.round(orderAmount),
      platformCommissionRate: config.platformCommissionRate,
      platformCommission: this.round(platformCommission),
      fleetCommissionRate: config.fleetCommissionRate || 0,
      fleetCommission: this.round(fleetCommission),
      driverEarnings: this.round(driverEarnings),
      tipAmount: this.round(tipAmount),
      totalDriverPayout: this.round(totalDriverPayout),
    };
  }

  /**
   * Process cash payment for a completed order
   * For cash, driver receives full amount but owes commission to platform
   */
  async processCashPayment(
    driverId: number,
    orderId: number,
    orderAmount: number,
    tipAmount: number = 0,
  ) {
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

    // Calculate commission
    const commission = this.calculateCommission(orderAmount, tipAmount, {
      platformCommissionRate,
      fleetCommissionRate,
    });

    // For cash payments, deduct commission from driver's wallet
    const commissionOwed = commission.platformCommission + commission.fleetCommission;

    // Create commission deduction transaction
    await this.prisma.driverTransaction.create({
      data: {
        driverId,
        orderId,
        amount: commissionOwed,
        currency: 'USD',
        type: TransactionType.debit,
        action: TransactionAction.commission,
        description: `Commission for cash order #${orderId}`,
      },
    });

    // Deduct from driver's wallet
    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        walletBalance: { decrement: commissionOwed },
      },
    });

    // If tip received, add to wallet
    if (tipAmount > 0) {
      await this.prisma.driverTransaction.create({
        data: {
          driverId,
          orderId,
          amount: tipAmount,
          currency: 'USD',
          type: TransactionType.credit,
          action: TransactionAction.tip,
          description: `Tip for order #${orderId}`,
        },
      });

      await this.prisma.driver.update({
        where: { id: driverId },
        data: {
          walletBalance: { increment: tipAmount },
        },
      });
    }

    // Update order with payment info
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paidAmount: orderAmount + tipAmount,
        providerShare: commissionOwed,
      },
    });

    return {
      success: true,
      commission,
      commissionDeducted: commissionOwed,
    };
  }

  /**
   * Process card/wallet payment for a completed order
   * For digital payments, driver receives their share directly
   */
  async processDigitalPayment(
    driverId: number,
    orderId: number,
    orderAmount: number,
    tipAmount: number = 0,
  ) {
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

    // Calculate commission
    const commission = this.calculateCommission(orderAmount, tipAmount, {
      platformCommissionRate,
      fleetCommissionRate,
    });

    // For digital payments, add driver's earnings to wallet
    await this.prisma.driverTransaction.create({
      data: {
        driverId,
        orderId,
        amount: commission.driverEarnings,
        currency: 'USD',
        type: TransactionType.credit,
        action: TransactionAction.ride_earning,
        description: `Earnings for order #${orderId}`,
      },
    });

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        walletBalance: { increment: commission.driverEarnings },
      },
    });

    // Add tip separately
    if (tipAmount > 0) {
      await this.prisma.driverTransaction.create({
        data: {
          driverId,
          orderId,
          amount: tipAmount,
          currency: 'USD',
          type: TransactionType.credit,
          action: TransactionAction.tip,
          description: `Tip for order #${orderId}`,
        },
      });

      await this.prisma.driver.update({
        where: { id: driverId },
        data: {
          walletBalance: { increment: tipAmount },
        },
      });
    }

    // Update order with payment info
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paidAmount: orderAmount + tipAmount,
        providerShare: commission.platformCommission + commission.fleetCommission,
      },
    });

    return {
      success: true,
      commission,
      driverEarnings: commission.totalDriverPayout,
    };
  }

  /**
   * Process payment for a completed order based on payment mode
   */
  async processOrderPayment(
    driverId: number,
    orderId: number,
    orderAmount: number,
    paymentMode: PaymentMode,
    tipAmount: number = 0,
  ) {
    if (paymentMode === PaymentMode.cash) {
      return this.processCashPayment(driverId, orderId, orderAmount, tipAmount);
    } else {
      return this.processDigitalPayment(driverId, orderId, orderAmount, tipAmount);
    }
  }

  /**
   * Get commission settings
   */
  async getCommissionSettings() {
    const settings = await this.prisma.setting.findMany({
      where: {
        key: { in: ['platform_commission_rate', 'minimum_commission'] },
      },
    });

    const settingsMap = settings.reduce(
      (acc, s) => ({ ...acc, [s.key]: s.value }),
      {} as Record<string, string>,
    );

    return {
      platformCommissionRate: parseFloat(settingsMap['platform_commission_rate'] || '20'),
      minimumCommission: parseFloat(settingsMap['minimum_commission'] || '0'),
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
