/**
 * Ride fare fee waterfall — single source of truth for how a finished ride's
 * fare is split between the government, the payment gateway, Wasel, the fleet,
 * and the driver.
 *
 * Waterfall (per ride `amount`, excluding tip):
 *   governmentFee   = government_fee                         (every ride)
 *   paymentFee      = gateway ? payment_flat_fee + amount * payment_percent_fee% : 0
 *   distributable   = amount - governmentFee - paymentFee
 *   platformComm    = distributable * platform_commission_rate%
 *   fleetComm       = (distributable - platformComm) * fleet%
 *   driverEarnings  = distributable - platformComm - fleetComm
 *   providerShare   = amount - driverEarnings   (everything not paid to the driver)
 *
 * Gateway fees (flat + percent) only apply to gateway-settled payments
 * (saved_payment_method / payment_gateway). Cash and wallet rides only pay the
 * flat government fee.
 */

export interface FeeRates {
  /** Flat QAR deducted from every ride. */
  governmentFee: number;
  /** Flat QAR deducted from gateway-settled rides only. */
  paymentFlatFee: number;
  /** Percent of the total fare deducted from gateway-settled rides only. */
  paymentPercentFee: number;
  /** Wasel's percent of the distributable remainder. */
  platformCommissionRate: number;
}

export interface RideSplitInput {
  /** Ride fare excluding tip. */
  amount: number;
  /** True for gateway-settled payments (saved_payment_method / payment_gateway). */
  usesGateway: boolean;
  /** Fleet's commission percent of the post-platform remainder (0 if no fleet). */
  fleetCommissionRate: number;
  rates: FeeRates;
}

export interface RideSplit {
  governmentFee: number;
  paymentFee: number;
  distributable: number;
  platformCommission: number;
  fleetCommission: number;
  driverEarnings: number;
  providerShare: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeRideSplit({
  amount,
  usesGateway,
  fleetCommissionRate,
  rates,
}: RideSplitInput): RideSplit {
  const safeAmount = Math.max(0, amount);

  // Government fee is capped at the fare so we never push the ride negative.
  const governmentFee = Math.min(rates.governmentFee, safeAmount);

  const paymentFee = usesGateway
    ? rates.paymentFlatFee + (safeAmount * rates.paymentPercentFee) / 100
    : 0;

  const distributable = Math.max(0, safeAmount - governmentFee - paymentFee);
  const platformCommission = (distributable * rates.platformCommissionRate) / 100;
  const afterPlatform = distributable - platformCommission;
  const fleetCommission = (afterPlatform * fleetCommissionRate) / 100;
  const driverEarnings = distributable - platformCommission - fleetCommission;
  const providerShare = safeAmount - driverEarnings;

  return {
    governmentFee: round2(governmentFee),
    paymentFee: round2(paymentFee),
    distributable: round2(distributable),
    platformCommission: round2(platformCommission),
    fleetCommission: round2(fleetCommission),
    driverEarnings: round2(driverEarnings),
    providerShare: round2(providerShare),
  };
}

export const FEE_SETTING_KEYS = {
  governmentFee: 'government_fee',
  paymentFlatFee: 'payment_flat_fee',
  paymentPercentFee: 'payment_percent_fee',
  platformCommissionRate: 'platform_commission_rate',
} as const;

export const FEE_DEFAULTS: FeeRates = {
  governmentFee: 5,
  paymentFlatFee: 1,
  paymentPercentFee: 2.3,
  platformCommissionRate: 20,
};

/** Payment modes that settle through the payment gateway (and so incur gateway fees). */
export const GATEWAY_PAYMENT_MODES = ['saved_payment_method', 'payment_gateway'];

export function usesGatewayMode(paymentMode: string | null | undefined): boolean {
  return !!paymentMode && GATEWAY_PAYMENT_MODES.includes(paymentMode);
}

interface SettingReader {
  setting: { findMany: (args: any) => Promise<Array<{ key: string; value: string }>> };
}

/** Load fee rates from the `settings` table, falling back to FEE_DEFAULTS. */
export async function loadFeeRates(prisma: SettingReader): Promise<FeeRates> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(FEE_SETTING_KEYS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (key: string, def: number) => {
    const raw = map.get(key);
    const parsed = raw != null ? parseFloat(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : def;
  };
  return {
    governmentFee: num(FEE_SETTING_KEYS.governmentFee, FEE_DEFAULTS.governmentFee),
    paymentFlatFee: num(FEE_SETTING_KEYS.paymentFlatFee, FEE_DEFAULTS.paymentFlatFee),
    paymentPercentFee: num(FEE_SETTING_KEYS.paymentPercentFee, FEE_DEFAULTS.paymentPercentFee),
    platformCommissionRate: num(
      FEE_SETTING_KEYS.platformCommissionRate,
      FEE_DEFAULTS.platformCommissionRate,
    ),
  };
}
