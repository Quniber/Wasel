import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionType, TransactionAction } from 'database';
import * as bcrypt from 'bcrypt';

@Injectable()
export class FleetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phoneNumber: { contains: search } },
        { mobileNumber: { contains: search } },
      ];
    }

    const [fleets, total] = await Promise.all([
      this.prisma.fleet.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { drivers: true, orders: true },
          },
        },
      }),
      this.prisma.fleet.count({ where }),
    ]);

    return { fleets, total, page, limit };
  }

  async findOne(id: number) {
    const fleet = await this.prisma.fleet.findUnique({
      where: { id },
      include: {
        profilePicture: true,
        _count: {
          select: { drivers: true, orders: true },
        },
      },
    });
    if (!fleet) throw new NotFoundException('Fleet not found');
    return fleet;
  }

  async create(data: {
    name: string;
    phoneNumber: string;
    mobileNumber: string;
    address?: string;
    accountNumber?: string;
    commissionSharePercent?: number;
    commissionShareFlat?: number;
    userName?: string;
    password?: string;
  }) {
    const createData: any = {
      name: data.name,
      phoneNumber: data.phoneNumber,
      mobileNumber: data.mobileNumber,
      address: data.address,
      accountNumber: data.accountNumber,
      commissionSharePercent: data.commissionSharePercent || 0,
      commissionShareFlat: data.commissionShareFlat || 0,
      userName: data.userName,
    };

    if (data.password) {
      createData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.fleet.create({
      data: createData,
    });
  }

  async update(id: number, data: {
    name?: string;
    phoneNumber?: string;
    mobileNumber?: string;
    address?: string;
    accountNumber?: string;
    commissionSharePercent?: number;
    commissionShareFlat?: number;
    feeMultiplier?: number;
    userName?: string;
    password?: string;
    isBlocked?: boolean;
  }) {
    await this.findOne(id);

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.fleet.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.fleet.delete({ where: { id } });
  }

  // Drivers
  async getDrivers(fleetId: number, page = 1, limit = 20) {
    await this.findOne(fleetId);
    const skip = (page - 1) * limit;

    const [drivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        where: { fleetId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          carModel: true,
          carColor: true,
        },
      }),
      this.prisma.driver.count({ where: { fleetId } }),
    ]);

    return { drivers, total, page, limit };
  }

  async addDriverToFleet(fleetId: number, driverId: number) {
    await this.findOne(fleetId);
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { fleetId },
      include: { carModel: true, carColor: true },
    });
  }

  async removeDriverFromFleet(fleetId: number, driverId: number) {
    await this.findOne(fleetId);
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { fleetId: null },
    });
  }

  // Orders
  async getOrders(fleetId: number, page = 1, limit = 20) {
    await this.findOne(fleetId);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { fleetId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          driver: { select: { id: true, firstName: true, lastName: true } },
          service: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.count({ where: { fleetId } }),
    ]);

    return { orders, total, page, limit };
  }

  // Wallet
  async getWallet(fleetId: number) {
    const fleet = await this.findOne(fleetId);
    const transactions = await this.prisma.fleetTransaction.findMany({
      where: { fleetId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        order: { select: { id: true, status: true } },
      },
    });

    return {
      balance: fleet.walletBalance,
      transactions,
    };
  }

  async adjustWallet(
    fleetId: number,
    amount: number,
    type: TransactionType,
    description: string,
  ) {
    await this.findOne(fleetId);

    const [transaction] = await this.prisma.$transaction([
      this.prisma.fleetTransaction.create({
        data: {
          fleetId,
          type,
          action: TransactionAction.adjustment,
          amount,
          description,
        },
      }),
      this.prisma.fleet.update({
        where: { id: fleetId },
        data: {
          walletBalance: {
            increment: type === TransactionType.credit ? amount : -amount,
          },
        },
      }),
    ]);

    return transaction;
  }

  // Stats
  async getStats(fleetId: number) {
    const fleet = await this.findOne(fleetId);

    const [totalDrivers, activeDrivers, totalOrders, completedOrders, totalEarnings] = await Promise.all([
      this.prisma.driver.count({ where: { fleetId } }),
      this.prisma.driver.count({ where: { fleetId, status: { in: ['online', 'offline', 'in_ride'] } } }),
      this.prisma.order.count({ where: { fleetId } }),
      this.prisma.order.count({ where: { fleetId, status: 'Finished' } }),
      this.prisma.fleetTransaction.aggregate({
        where: { fleetId, type: TransactionType.credit },
        _sum: { amount: true },
      }),
    ]);

    return {
      walletBalance: fleet.walletBalance,
      totalDrivers,
      activeDrivers,
      totalOrders,
      completedOrders,
      commissionPercent: fleet.commissionSharePercent,
      commissionFlat: fleet.commissionShareFlat,
      totalEarnings: Number(totalEarnings._sum.amount || 0),
    };
  }
}
