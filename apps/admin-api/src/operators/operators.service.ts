import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperatorRole } from 'database';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OperatorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, role?: OperatorRole) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (role) {
      where.role = role;
    }

    const [operators, total] = await Promise.all([
      this.prisma.operator.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              customerNotes: true,
              driverNotes: true,
              orderNotes: true,
              verifiedDocuments: true,
            },
          },
        },
      }),
      this.prisma.operator.count({ where }),
    ]);

    return {
      data: operators,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        notificationToken: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            customerNotes: true,
            driverNotes: true,
            orderNotes: true,
            verifiedDocuments: true,
          },
        },
      },
    });
    if (!operator) throw new NotFoundException('Operator not found');
    return operator;
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: OperatorRole;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.operator.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.operator.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        role: data.role || OperatorRole.operator,
        isActive: data.isActive ?? true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: number, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: OperatorRole;
    isActive?: boolean;
    notificationToken?: string;
  }) {
    await this.findOne(id);

    if (data.email) {
      const existing = await this.prisma.operator.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    return this.prisma.operator.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        notificationToken: true,
        updatedAt: true,
      },
    });
  }

  async updatePassword(id: number, newPassword: string) {
    await this.findOne(id);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return this.prisma.operator.update({
      where: { id },
      data: { password: hashedPassword },
      select: { id: true, email: true, updatedAt: true },
    });
  }

  async remove(id: number, currentOperatorId: number) {
    if (id === currentOperatorId) {
      throw new ForbiddenException('Cannot delete your own account');
    }
    await this.findOne(id);
    return this.prisma.operator.delete({ where: { id } });
  }

  async toggleActive(id: number, isActive: boolean, currentOperatorId: number) {
    if (id === currentOperatorId && !isActive) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }
    await this.findOne(id);
    return this.prisma.operator.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  async getActivity(operatorId: number, page = 1, limit = 50) {
    await this.findOne(operatorId);
    const skip = (page - 1) * limit;

    const [customerNotes, driverNotes, orderNotes, verifiedDocs] = await Promise.all([
      this.prisma.customerNote.findMany({
        where: { operatorId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { customer: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.driverNote.findMany({
        where: { operatorId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.orderNote.findMany({
        where: { operatorId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { order: { select: { id: true, status: true } } },
      }),
      this.prisma.driverDocument.findMany({
        where: { verifiedById: operatorId },
        orderBy: { verifiedAt: 'desc' },
        take: 20,
        include: {
          driver: { select: { id: true, firstName: true, lastName: true } },
          documentType: { select: { name: true } },
        },
      }),
    ]);

    return {
      customerNotes,
      driverNotes,
      orderNotes,
      verifiedDocuments: verifiedDocs,
    };
  }

  async getStats() {
    const [totalOperators, activeOperators, byRole] = await Promise.all([
      this.prisma.operator.count(),
      this.prisma.operator.count({ where: { isActive: true } }),
      this.prisma.operator.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
    ]);

    return {
      totalOperators,
      activeOperators,
      inactiveOperators: totalOperators - activeOperators,
      byRole: byRole.reduce((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
