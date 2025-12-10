import { CommissionCalculation } from './types';

export interface CommissionConfig {
  platformCommissionRate: number; // Percentage (e.g., 20 for 20%)
  fleetCommissionRate?: number; // Percentage (e.g., 5 for 5%)
  minimumPlatformCommission?: number; // Minimum commission amount
  minimumFleetCommission?: number;
}

/**
 * Commission Calculator Service
 * Handles platform and fleet commission calculations
 */
export class CommissionService {
  private defaultConfig: CommissionConfig = {
    platformCommissionRate: 20,
    fleetCommissionRate: 0,
    minimumPlatformCommission: 0,
    minimumFleetCommission: 0,
  };

  /**
   * Calculate commission breakdown for an order
   */
  calculate(
    orderAmount: number,
    tipAmount: number = 0,
    config?: Partial<CommissionConfig>,
  ): CommissionCalculation {
    const finalConfig = { ...this.defaultConfig, ...config };

    // Platform commission (from base fare, not tip)
    let platformCommission = (orderAmount * finalConfig.platformCommissionRate) / 100;

    // Apply minimum platform commission
    if (finalConfig.minimumPlatformCommission && platformCommission < finalConfig.minimumPlatformCommission) {
      platformCommission = finalConfig.minimumPlatformCommission;
    }

    // Ensure commission doesn't exceed order amount
    platformCommission = Math.min(platformCommission, orderAmount);

    // Fleet commission (from driver's share after platform commission)
    const afterPlatform = orderAmount - platformCommission;
    let fleetCommission = 0;

    if (finalConfig.fleetCommissionRate && finalConfig.fleetCommissionRate > 0) {
      fleetCommission = (afterPlatform * finalConfig.fleetCommissionRate) / 100;

      // Apply minimum fleet commission
      if (finalConfig.minimumFleetCommission && fleetCommission < finalConfig.minimumFleetCommission) {
        fleetCommission = finalConfig.minimumFleetCommission;
      }

      // Ensure fleet commission doesn't exceed remaining amount
      fleetCommission = Math.min(fleetCommission, afterPlatform);
    }

    // Driver earnings (after all commissions)
    const driverEarnings = orderAmount - platformCommission - fleetCommission;

    // Tips go 100% to driver
    const totalDriverPayout = driverEarnings + tipAmount;

    return {
      orderAmount: this.round(orderAmount),
      platformCommissionRate: finalConfig.platformCommissionRate,
      platformCommission: this.round(platformCommission),
      fleetCommissionRate: finalConfig.fleetCommissionRate || 0,
      fleetCommission: this.round(fleetCommission),
      driverEarnings: this.round(driverEarnings),
      tipAmount: this.round(tipAmount),
      totalDriverPayout: this.round(totalDriverPayout),
    };
  }

  /**
   * Calculate commission for cash payments
   * For cash, driver receives full amount but owes commission to platform
   */
  calculateCashPaymentDebt(
    orderAmount: number,
    tipAmount: number = 0,
    config?: Partial<CommissionConfig>,
  ): {
    commission: CommissionCalculation;
    driverOwes: number; // Amount driver owes to platform (deducted from wallet)
  } {
    const commission = this.calculate(orderAmount, tipAmount, config);

    // Driver owes platform commission + fleet commission
    const driverOwes = commission.platformCommission + commission.fleetCommission;

    return {
      commission,
      driverOwes: this.round(driverOwes),
    };
  }

  /**
   * Round to 2 decimal places
   */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// Export singleton instance
export const commissionService = new CommissionService();
