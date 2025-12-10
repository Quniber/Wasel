import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchService } from '../socket/dispatch.service';
import { OrderStatus, TransactionType, TransactionAction } from 'database';

@Injectable()
export class OrdersService {
  private logger = new Logger('OrdersService');

  constructor(
    private prisma: PrismaService,
    private dispatchService: DispatchService,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    status?: OrderStatus,
    customerId?: number,
    driverId?: number,
    serviceId?: number,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (driverId) {
      where.driverId = driverId;
    }

    if (serviceId) {
      where.serviceId = serviceId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, mobileNumber: true } },
          driver: { select: { id: true, firstName: true, lastName: true, mobileNumber: true } },
          service: { select: { id: true, name: true } },
          region: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { orders, total, page, limit };
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        driver: true,
        service: true,
        region: true,
        fleet: true,
        coupon: true,
        cancelReason: true,
        options: {
          include: { serviceOption: true },
        },
        feedback: true,
        riderReview: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(data: {
    customerId: number;
    serviceId: number;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress?: string;
    dropoffLatitude?: number;
    dropoffLongitude?: number;
    driverId?: number;
    regionId?: number;
    couponCode?: string;
    scheduledAt?: Date;
  }) {
    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Verify service exists
    const service = await this.prisma.service.findUnique({
      where: { id: data.serviceId },
    });
    if (!service) throw new NotFoundException('Service not found');

    // Verify driver if provided
    if (data.driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: data.driverId },
      });
      if (!driver) throw new NotFoundException('Driver not found');
    }

    // Calculate estimated cost (convert Decimal to Number)
    const estimatedCost = Number(service.baseFare) + Number(service.minimumFare || 0);

    // Build addresses JSON for multi-waypoint support
    const addresses = JSON.stringify([
      {
        type: 'pickup',
        address: data.pickupAddress,
        latitude: data.pickupLatitude,
        longitude: data.pickupLongitude,
      },
      ...(data.dropoffAddress ? [{
        type: 'dropoff',
        address: data.dropoffAddress,
        latitude: data.dropoffLatitude,
        longitude: data.dropoffLongitude,
      }] : []),
    ]);

    // Build points JSON (route polyline placeholder)
    const points = JSON.stringify([]);

    // Create the order - always start as Requested so driver can accept
    const order = await this.prisma.order.create({
      data: {
        customerId: data.customerId,
        serviceId: data.serviceId,
        // Don't assign driver yet - let them accept first
        regionId: data.regionId,
        status: OrderStatus.Requested,
        addresses,
        points,
        pickupAddress: data.pickupAddress,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        dropoffAddress: data.dropoffAddress,
        dropoffLatitude: data.dropoffLatitude,
        dropoffLongitude: data.dropoffLongitude,
        expectedTimestamp: data.scheduledAt || new Date(),
        serviceCost: estimatedCost,
        currency: 'USD',
      },
      include: {
        customer: true,
        driver: true,
        service: true,
      },
    });

    // Create initial activity log
    await this.prisma.orderActivity.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: 'Order created by admin',
      },
    });

    // Dispatch the order to driver(s)
    if (data.driverId) {
      // If a specific driver was selected, dispatch to them
      this.logger.log(`Dispatching order ${order.id} to specific driver ${data.driverId}`);
      const dispatched = await this.dispatchService.dispatchToDriver(order.id, data.driverId);
      if (!dispatched) {
        this.logger.warn(`Failed to dispatch order ${order.id} to driver ${data.driverId}`);
      }
    } else {
      // Otherwise dispatch to nearby drivers
      this.logger.log(`Dispatching order ${order.id} to nearby drivers`);
      const dispatched = await this.dispatchService.dispatchOrder(order.id);
      if (!dispatched) {
        this.logger.warn(`No drivers available for order ${order.id}`);
      }
    }

    return order;
  }

  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.findOne(id);

    // Update timestamps based on status
    const data: any = { status };

    switch (status) {
      case OrderStatus.DriverAccepted:
        data.acceptedAt = new Date();
        break;
      case OrderStatus.Arrived:
        data.arrivedAt = new Date();
        break;
      case OrderStatus.Started:
        data.startedAt = new Date();
        break;
      case OrderStatus.Finished:
        data.finishedAt = new Date();
        break;
      case OrderStatus.DriverCanceled:
      case OrderStatus.RiderCanceled:
        data.canceledAt = new Date();
        break;
    }

    // Log activity
    await this.prisma.orderActivity.create({
      data: {
        orderId: id,
        status,
      },
    });

    return this.prisma.order.update({
      where: { id },
      data,
      include: {
        customer: true,
        driver: true,
        service: true,
      },
    });
  }

  async assignDriver(id: number, driverId: number) {
    await this.findOne(id);

    // Log activity
    await this.prisma.orderActivity.create({
      data: {
        orderId: id,
        status: OrderStatus.DriverAccepted,
        note: `Driver manually assigned`,
      },
    });

    return this.prisma.order.update({
      where: { id },
      data: {
        driverId,
        status: OrderStatus.DriverAccepted,
        acceptedAt: new Date(),
      },
      include: {
        customer: true,
        driver: true,
        service: true,
      },
    });
  }

  async cancelOrder(id: number, cancelReasonId?: number, cancelReasonNote?: string) {
    const order = await this.findOne(id);

    if (order.status === OrderStatus.Finished) {
      throw new BadRequestException('Cannot cancel a finished order');
    }

    // Log activity
    await this.prisma.orderActivity.create({
      data: {
        orderId: id,
        status: OrderStatus.RiderCanceled,
        note: cancelReasonNote || 'Order cancelled by admin',
      },
    });

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.RiderCanceled,
        canceledAt: new Date(),
        cancelReasonId,
        cancelReasonNote,
      },
      include: {
        customer: true,
        driver: true,
      },
    });
  }

  // Timeline/Activity
  async getTimeline(orderId: number) {
    await this.findOne(orderId);
    return this.prisma.orderActivity.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Messages
  async getMessages(orderId: number) {
    await this.findOne(orderId);
    return this.prisma.orderMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Notes
  async getNotes(orderId: number) {
    await this.findOne(orderId);
    return this.prisma.orderNote.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: {
        operator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addNote(orderId: number, operatorId: number, note: string) {
    await this.findOne(orderId);
    return this.prisma.orderNote.create({
      data: {
        orderId,
        operatorId,
        note,
      },
      include: {
        operator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // Refunds
  async refundOrder(orderId: number, amount: number, description: string) {
    const order = await this.findOne(orderId);

    if (!order.customerId) {
      throw new BadRequestException('Order has no customer');
    }

    // Create refund transaction for customer
    const [customerTransaction] = await this.prisma.$transaction([
      this.prisma.customerTransaction.create({
        data: {
          customerId: order.customerId,
          orderId,
          type: TransactionType.credit,
          action: TransactionAction.refund,
          amount,
          description,
        },
      }),
      this.prisma.customer.update({
        where: { id: order.customerId },
        data: {
          walletBalance: { increment: amount },
        },
      }),
    ]);

    return customerTransaction;
  }

  // SOS Calls
  async getSOSCalls(orderId: number) {
    await this.findOne(orderId);
    return this.prisma.sOS.findMany({
      where: { orderId },
      include: {
        reason: true,
        activities: {
          include: {
            operator: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSOS(sosId: number, operatorId: number, status: string, note?: string) {
    const sos = await this.prisma.sOS.findUnique({ where: { id: sosId } });
    if (!sos) throw new NotFoundException('SOS not found');

    // Add activity
    await this.prisma.sOSActivity.create({
      data: {
        sosId,
        operatorId,
        action: status,
        note,
      },
    });

    return this.prisma.sOS.update({
      where: { id: sosId },
      data: { status: status as any },
      include: {
        reason: true,
        activities: true,
      },
    });
  }

  // Stats
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      todayTotal,
      todayCompleted,
      todayRevenue,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.Requested, OrderStatus.Booked] } },
      }),
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.DriverAccepted, OrderStatus.Arrived, OrderStatus.Started] } },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.Finished } }),
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.RiderCanceled, OrderStatus.DriverCanceled] } },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.Finished, createdAt: { gte: today } },
      }),
      this.prisma.order.aggregate({
        where: { status: OrderStatus.Finished, createdAt: { gte: today } },
        _sum: { paidAmount: true },
      }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      today: {
        total: todayTotal,
        completed: todayCompleted,
        revenue: Number(todayRevenue._sum.paidAmount || 0),
      },
    };
  }

  // Get cancel reasons
  async getCancelReasons() {
    return this.prisma.orderCancelReason.findMany({
      where: { isActive: true },
      orderBy: { title: 'asc' },
    });
  }
}
