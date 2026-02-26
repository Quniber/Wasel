import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  // Get available coupons for customer
  async getAvailableCoupons(customerId: number) {
    const now = new Date();

    const coupons = await this.prisma.coupon.findMany({
      where: {
        isEnabled: true,
        startAt: { lte: now },
        OR: [
          { expireAt: null },
          { expireAt: { gte: now } },
        ],
      },
      orderBy: { expireAt: 'asc' },
    });

    // Filter by customer usage if applicable
    const availableCoupons = await Promise.all(
      coupons.map(async (coupon) => {
        // Check global usage limit (0 means unlimited)
        if (coupon.manyUsersCanUse > 0) {
          const totalUsage = await this.prisma.order.count({
            where: {
              couponId: coupon.id,
              status: { notIn: ['RiderCanceled', 'DriverCanceled'] },
            },
          });
          if (totalUsage >= coupon.manyUsersCanUse) {
            return null;
          }
        }

        // Check per-user limit
        if (coupon.manyTimesUserCanUse > 0) {
          const usageCount = await this.prisma.order.count({
            where: {
              customerId,
              couponId: coupon.id,
              status: { notIn: ['RiderCanceled', 'DriverCanceled'] },
            },
          });
          if (usageCount >= coupon.manyTimesUserCanUse) {
            return null;
          }
        }

        const isFlat = Number(coupon.discountFlat) > 0;

        return {
          id: coupon.id,
          code: coupon.code,
          title: coupon.title,
          description: coupon.description,
          discountType: isFlat ? 'flat' : 'percent',
          discountValue: isFlat ? Number(coupon.discountFlat) : coupon.discountPercent,
          minimumOrderAmount: Number(coupon.minimumCost),
          maximumDiscount: Number(coupon.maximumCost),
          expireAt: coupon.expireAt,
        };
      }),
    );

    return availableCoupons.filter((c) => c !== null);
  }

  // Validate coupon code (check if valid without applying)
  async validateCouponCode(customerId: number, code: string) {
    const now = new Date();

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isEnabled: true,
        startAt: { lte: now },
        OR: [
          { expireAt: null },
          { expireAt: { gte: now } },
        ],
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found or expired');
    }

    // Check global usage limit (0 means unlimited)
    if (coupon.manyUsersCanUse > 0) {
      const totalUsage = await this.prisma.order.count({
        where: {
          couponId: coupon.id,
          status: { notIn: ['RiderCanceled', 'DriverCanceled'] },
        },
      });
      if (totalUsage >= coupon.manyUsersCanUse) {
        throw new BadRequestException('Coupon usage limit exceeded');
      }
    }

    // Check per-user limit
    if (coupon.manyTimesUserCanUse > 0) {
      const usageCount = await this.prisma.order.count({
        where: {
          customerId,
          couponId: coupon.id,
          status: { notIn: ['RiderCanceled', 'DriverCanceled'] },
        },
      });
      if (usageCount >= coupon.manyTimesUserCanUse) {
        throw new BadRequestException('You have already used this coupon');
      }
    }

    const isFlat = Number(coupon.discountFlat) > 0;

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: isFlat ? 'flat' : 'percent',
        discountValue: isFlat ? Number(coupon.discountFlat) : coupon.discountPercent,
        minimumOrderAmount: Number(coupon.minimumCost),
        maximumDiscount: Number(coupon.maximumCost),
        expireAt: coupon.expireAt,
      },
    };
  }

  // Apply coupon to order (calculate discount)
  async applyCoupon(customerId: number, code: string, orderAmount: number) {
    const now = new Date();

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isEnabled: true,
        startAt: { lte: now },
        OR: [
          { expireAt: null },
          { expireAt: { gte: now } },
        ],
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found or expired');
    }

    // Check global usage limit (0 means unlimited)
    if (coupon.manyUsersCanUse > 0) {
      const totalUsage = await this.prisma.order.count({
        where: {
          couponId: coupon.id,
          status: { notIn: ['RiderCanceled', 'DriverCanceled'] },
        },
      });
      if (totalUsage >= coupon.manyUsersCanUse) {
        throw new BadRequestException('Coupon usage limit exceeded');
      }
    }

    // Check per-user limit
    if (coupon.manyTimesUserCanUse > 0) {
      const usageCount = await this.prisma.order.count({
        where: {
          customerId,
          couponId: coupon.id,
          status: { notIn: ['RiderCanceled', 'DriverCanceled'] },
        },
      });
      if (usageCount >= coupon.manyTimesUserCanUse) {
        throw new BadRequestException('You have already used this coupon');
      }
    }

    // Check minimum order amount
    const minimumCost = Number(coupon.minimumCost);
    if (orderAmount < minimumCost) {
      throw new BadRequestException(`Minimum order amount is $${minimumCost}`);
    }

    // Calculate discount
    const isFlat = Number(coupon.discountFlat) > 0;
    let discount: number;
    if (isFlat) {
      discount = Number(coupon.discountFlat);
    } else {
      discount = (orderAmount * coupon.discountPercent) / 100;
      const maxDiscount = Number(coupon.maximumCost);
      if (maxDiscount > 0 && discount > maxDiscount) {
        discount = maxDiscount;
      }
    }

    // Ensure discount doesn't exceed order amount
    if (discount > orderAmount) {
      discount = orderAmount;
    }

    const finalAmount = orderAmount - discount;

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        discountType: isFlat ? 'flat' : 'percent',
        discountValue: isFlat ? Number(coupon.discountFlat) : coupon.discountPercent,
      },
      discount: Math.round(discount * 100) / 100,
      originalAmount: orderAmount,
      finalAmount: Math.round(finalAmount * 100) / 100,
    };
  }

  // Get coupon by code (public info)
  async getCouponByCode(code: string) {
    const now = new Date();

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isEnabled: true,
        startAt: { lte: now },
        OR: [
          { expireAt: null },
          { expireAt: { gte: now } },
        ],
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found or expired');
    }

    const isFlat = Number(coupon.discountFlat) > 0;

    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      discountType: isFlat ? 'flat' : 'percent',
      discountValue: isFlat ? Number(coupon.discountFlat) : coupon.discountPercent,
      minimumOrderAmount: Number(coupon.minimumCost),
      maximumDiscount: Number(coupon.maximumCost),
      expireAt: coupon.expireAt,
    };
  }
}
