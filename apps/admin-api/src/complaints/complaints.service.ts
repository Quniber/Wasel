import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupportRequestStatus } from 'database';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status as SupportRequestStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.supportRequest.findMany({
        where,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, mobileNumber: true },
          },
          order: {
            select: { id: true, pickupAddress: true, dropoffAddress: true, status: true },
          },
          activities: {
            include: {
              operator: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportRequest.count({ where }),
    ]);

    return {
      data: data.map((complaint) => ({
        id: complaint.id,
        subject: complaint.subject,
        content: complaint.content,
        status: complaint.status,
        response: complaint.activities[0]?.content,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
        customer: complaint.customer,
        order: complaint.order,
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
    const complaint = await this.prisma.supportRequest.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, mobileNumber: true, email: true },
        },
        order: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            status: true,
            createdAt: true,
            paidAmount: true,
          },
        },
        activities: {
          include: {
            operator: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return {
      id: complaint.id,
      subject: complaint.subject,
      content: complaint.content,
      status: complaint.status,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
      customer: complaint.customer,
      order: complaint.order,
      activities: complaint.activities.map((a) => ({
        id: a.id,
        actorType: a.actorType,
        content: a.content,
        operator: a.operator,
        createdAt: a.createdAt,
      })),
    };
  }

  async updateStatus(id: number, status: string, response?: string, operatorId?: number) {
    const complaint = await this.prisma.supportRequest.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    // Update the status
    await this.prisma.supportRequest.update({
      where: { id },
      data: {
        status: status as SupportRequestStatus,
      },
    });

    // Add activity if there's a response
    if (response) {
      await this.prisma.supportRequestActivity.create({
        data: {
          supportRequestId: id,
          operatorId,
          actorType: 'operator',
          content: response,
        },
      });
    }

    return this.findOne(id);
  }

  async addResponse(id: number, content: string, operatorId: number) {
    const complaint = await this.prisma.supportRequest.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    await this.prisma.supportRequestActivity.create({
      data: {
        supportRequestId: id,
        operatorId,
        actorType: 'operator',
        content,
      },
    });

    // Mark as in_progress if it was submitted
    if (complaint.status === SupportRequestStatus.submitted) {
      await this.prisma.supportRequest.update({
        where: { id },
        data: { status: SupportRequestStatus.in_progress },
      });
    }

    return this.findOne(id);
  }

  async getStats() {
    const [submitted, inProgress, resolved, total] = await Promise.all([
      this.prisma.supportRequest.count({ where: { status: SupportRequestStatus.submitted } }),
      this.prisma.supportRequest.count({ where: { status: SupportRequestStatus.in_progress } }),
      this.prisma.supportRequest.count({ where: { status: SupportRequestStatus.resolved } }),
      this.prisma.supportRequest.count(),
    ]);

    return {
      submitted,
      inProgress,
      resolved,
      total,
    };
  }
}
