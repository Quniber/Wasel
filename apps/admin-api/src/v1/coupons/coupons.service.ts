import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { title: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { orders: true, customers: true },
          },
        },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: data.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountPercent > 0 ? 'percent' : 'fixed',
        discountAmount: coupon.discountPercent > 0 ? coupon.discountPercent : Number(coupon.discountFlat),
        minimumOrderAmount: Number(coupon.minimumCost),
        maximumDiscount: Number(coupon.maximumCost),
        usageLimit: coupon.manyUsersCanUse,
        usedCount: coupon._count.orders,
        startDate: coupon.startAt,
        endDate: coupon.expireAt,
        isActive: coupon.isEnabled,
        createdAt: coupon.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true, customers: true },
        },
        services: {
          include: {
            service: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      discountType: coupon.discountPercent > 0 ? 'percent' : 'fixed',
      discountAmount: coupon.discountPercent > 0 ? coupon.discountPercent : Number(coupon.discountFlat),
      minimumOrderAmount: Number(coupon.minimumCost),
      maximumDiscount: Number(coupon.maximumCost),
      usageLimit: coupon.manyUsersCanUse,
      usedCount: coupon._count.orders,
      startDate: coupon.startAt,
      endDate: coupon.expireAt,
      isActive: coupon.isEnabled,
      isFirstTravelOnly: coupon.isFirstTravelOnly,
      creditGift: Number(coupon.creditGift),
      services: coupon.services.map((s) => s.service),
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }

  async create(data: {
    code: string;
    title: string;
    description?: string;
    discountType: 'fixed' | 'percent';
    discountAmount: number;
    minimumOrderAmount?: number;
    maximumDiscount?: number;
    usageLimit?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }) {
    const coupon = await this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        title: data.title,
        description: data.description,
        discountPercent: data.discountType === 'percent' ? data.discountAmount : 0,
        discountFlat: data.discountType === 'fixed' ? data.discountAmount : 0,
        minimumCost: data.minimumOrderAmount || 0,
        maximumCost: data.maximumDiscount || 0,
        manyUsersCanUse: data.usageLimit || 0,
        startAt: data.startDate ? new Date(data.startDate) : new Date(),
        expireAt: data.endDate ? new Date(data.endDate) : null,
        isEnabled: data.isActive ?? true,
      },
    });

    return this.findOne(coupon.id);
  }

  async update(
    id: number,
    data: {
      code?: string;
      title?: string;
      description?: string;
      discountType?: 'fixed' | 'percent';
      discountAmount?: number;
      minimumOrderAmount?: number;
      maximumDiscount?: number;
      usageLimit?: number;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    },
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const updateData: any = {};
    if (data.code) updateData.code = data.code.toUpperCase();
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.discountType && data.discountAmount !== undefined) {
      updateData.discountPercent = data.discountType === 'percent' ? data.discountAmount : 0;
      updateData.discountFlat = data.discountType === 'fixed' ? data.discountAmount : 0;
    }
    if (data.minimumOrderAmount !== undefined) updateData.minimumCost = data.minimumOrderAmount;
    if (data.maximumDiscount !== undefined) updateData.maximumCost = data.maximumDiscount;
    if (data.usageLimit !== undefined) updateData.manyUsersCanUse = data.usageLimit;
    if (data.startDate) updateData.startAt = new Date(data.startDate);
    if (data.endDate) updateData.expireAt = new Date(data.endDate);
    if (data.isActive !== undefined) updateData.isEnabled = data.isActive;

    await this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    await this.prisma.coupon.delete({
      where: { id },
    });

    return { success: true };
  }
}
