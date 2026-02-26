import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CustomerStatus, TransactionType, TransactionAction, AddressType, Gender } from 'database';
import { Prisma } from 'database';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    status?: CustomerStatus,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { mobileNumber: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          media: true,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { customers, total, page, limit };
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        media: true,
        addresses: true,
        savedPaymentMethods: {
          include: { paymentGateway: true },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobileNumber: string;
    countryIso?: string;
    gender?: Gender;
  }) {
    try {
      return await this.prisma.customer.create({
        data: {
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          email: data.email || null, // Convert empty string to null to avoid unique constraint issues
          mobileNumber: data.mobileNumber,
          countryIso: data.countryIso || null,
          gender: data.gender || null,
        },
        include: { media: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('mobileNumber')) {
            throw new ConflictException('A customer with this mobile number already exists');
          }
          if (target.includes('email')) {
            throw new ConflictException('A customer with this email already exists');
          }
          throw new ConflictException('A customer with these details already exists');
        }
      }
      throw error;
    }
  }

  async update(id: number, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobileNumber?: string;
    status?: CustomerStatus;
    countryIso?: string;
    gender?: Gender;
  }) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data,
      include: { media: true, addresses: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.customer.delete({ where: { id } });
  }

  // Address Management
  async getAddresses(customerId: number) {
    await this.findOne(customerId);
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addAddress(customerId: number, data: {
    type?: AddressType;
    title?: string;
    address: string;
    latitude: number;
    longitude: number;
    isDefault?: boolean;
  }) {
    await this.findOne(customerId);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.create({
      data: {
        customerId,
        type: data.type || AddressType.other,
        title: data.title,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        isDefault: data.isDefault || false,
      },
    });
  }

  async updateAddress(addressId: number, data: {
    type?: AddressType;
    title?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }) {
    const addr = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });
    if (!addr) throw new NotFoundException('Address not found');

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId: addr.customerId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data,
    });
  }

  async removeAddress(addressId: number) {
    const addr = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });
    if (!addr) throw new NotFoundException('Address not found');
    return this.prisma.customerAddress.delete({ where: { id: addressId } });
  }

  // Wallet Management
  async getWallet(customerId: number) {
    const customer = await this.findOne(customerId);
    const transactions = await this.prisma.customerTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        order: { select: { id: true, status: true } },
      },
    });

    return {
      balance: customer.walletBalance,
      transactions,
    };
  }

  async adjustWallet(
    customerId: number,
    amount: number,
    type: TransactionType,
    description: string,
  ) {
    await this.findOne(customerId);

    const [transaction] = await this.prisma.$transaction([
      this.prisma.customerTransaction.create({
        data: {
          customerId,
          type,
          action: TransactionAction.adjustment,
          amount,
          description,
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: {
          walletBalance: {
            increment: type === TransactionType.credit ? amount : -amount,
          },
        },
      }),
    ]);

    return transaction;
  }

  // Orders History
  async getOrders(customerId: number, page = 1, limit = 20) {
    await this.findOne(customerId);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: { select: { id: true, firstName: true, lastName: true } },
          service: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.count({ where: { customerId } }),
    ]);

    return { orders, total, page, limit };
  }

  // Stats
  async getStats(customerId: number) {
    const customer = await this.findOne(customerId);

    const [totalOrders, completedOrders, cancelledOrders, totalSpent] = await Promise.all([
      this.prisma.order.count({ where: { customerId } }),
      this.prisma.order.count({ where: { customerId, status: 'Finished' } }),
      this.prisma.order.count({
        where: { customerId, status: { in: ['DriverCanceled', 'RiderCanceled'] } },
      }),
      this.prisma.customerTransaction.aggregate({
        where: { customerId, type: TransactionType.debit },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      walletBalance: customer.walletBalance,
      totalSpent: Number(totalSpent._sum.amount || 0),
      memberSince: customer.createdAt,
      lastActivity: customer.lastActivityAt,
    };
  }

  // Notes
  async getNotes(customerId: number) {
    await this.findOne(customerId);
    return this.prisma.customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        operator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addNote(customerId: number, operatorId: number, note: string) {
    await this.findOne(customerId);
    return this.prisma.customerNote.create({
      data: {
        customerId,
        operatorId,
        note,
      },
      include: {
        operator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // Favorite & Blocked Drivers
  async getFavoriteDrivers(customerId: number) {
    await this.findOne(customerId);
    return this.prisma.favoriteDriver.findMany({
      where: { customerId },
      include: {
        driver: {
          select: { id: true, firstName: true, lastName: true, rating: true, media: true },
        },
      },
    });
  }

  async removeFavoriteDriver(customerId: number, driverId: number) {
    await this.findOne(customerId);
    return this.prisma.favoriteDriver.deleteMany({
      where: { customerId, driverId },
    });
  }

  async getBlockedDrivers(customerId: number) {
    await this.findOne(customerId);
    return this.prisma.blockedDriver.findMany({
      where: { customerId },
      include: {
        driver: {
          select: { id: true, firstName: true, lastName: true, media: true },
        },
      },
    });
  }

  async removeBlockedDriver(customerId: number, driverId: number) {
    await this.findOne(customerId);
    return this.prisma.blockedDriver.deleteMany({
      where: { customerId, driverId },
    });
  }

  // Coupons
  async getCoupons(customerId: number) {
    await this.findOne(customerId);
    return this.prisma.customerCoupon.findMany({
      where: { customerId },
      include: {
        coupon: true,
      },
    });
  }
}
