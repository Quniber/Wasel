import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocketService } from '../socket/socket.service';
import { OrderStatus, DriverStatus } from 'database';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  // Get available orders nearby (Requested status, no driver assigned)
  async getAvailableOrders(driverId: number) {
    // Verify driver is online and approved
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver || driver.status !== DriverStatus.online) {
      return [];
    }

    // Get orders that are requested and not yet assigned
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.Requested,
        driverId: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            presetAvatarNumber: true,
          },
        },
        service: true,
      },
    });

    return orders.map((order) => ({
      id: order.id,
      pickupAddress: order.pickupAddress,
      pickupLatitude: order.pickupLatitude,
      pickupLongitude: order.pickupLongitude,
      dropoffAddress: order.dropoffAddress,
      dropoffLatitude: order.dropoffLatitude,
      dropoffLongitude: order.dropoffLongitude,
      distanceMeters: order.distanceMeters,
      durationSeconds: order.durationSeconds,
      costBest: order.costBest,
      currency: order.currency,
      customer: order.customer,
      service: {
        id: order.service.id,
        name: order.service.name,
      },
      createdAt: order.createdAt,
    }));
  }

  // Get current active order
  async getCurrentOrder(driverId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        driverId,
        status: {
          in: [
            OrderStatus.DriverAccepted,
            OrderStatus.Arrived,
            OrderStatus.Started,
            OrderStatus.WaitingForPostPay,
            OrderStatus.WaitingForReview,
          ],
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            presetAvatarNumber: true,
          },
        },
        service: true,
      },
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      status: order.status,
      pickupAddress: order.pickupAddress,
      pickupLatitude: order.pickupLatitude,
      pickupLongitude: order.pickupLongitude,
      dropoffAddress: order.dropoffAddress,
      dropoffLatitude: order.dropoffLatitude,
      dropoffLongitude: order.dropoffLongitude,
      distanceMeters: order.distanceMeters,
      durationSeconds: order.durationSeconds,
      costBest: order.costBest,
      costAfterCoupon: order.costAfterCoupon,
      tipAmount: order.tipAmount,
      currency: order.currency,
      paymentMode: order.paymentMode,
      customer: order.customer,
      service: {
        id: order.service.id,
        name: order.service.name,
      },
      acceptedAt: order.acceptedAt,
      arrivedAt: order.arrivedAt,
      startedAt: order.startedAt,
      createdAt: order.createdAt,
    };
  }

  // Get order history
  async getMyOrders(driverId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          service: true,
        },
      }),
      this.prisma.order.count({ where: { driverId } }),
    ]);

    return {
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        pickupAddress: order.pickupAddress,
        dropoffAddress: order.dropoffAddress,
        costBest: order.costBest,
        costAfterCoupon: order.costAfterCoupon,
        tipAmount: order.tipAmount,
        currency: order.currency,
        paymentMode: order.paymentMode,
        customer: order.customer,
        service: {
          id: order.service.id,
          name: order.service.name,
        },
        finishedAt: order.finishedAt,
        createdAt: order.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Accept an order
  async acceptOrder(driverId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.Requested || order.driverId) {
      throw new BadRequestException('Order is no longer available');
    }

    // Check if driver already has an active order
    const activeOrder = await this.prisma.order.findFirst({
      where: {
        driverId,
        status: {
          in: [OrderStatus.DriverAccepted, OrderStatus.Arrived, OrderStatus.Started],
        },
      },
    });

    if (activeOrder) {
      throw new BadRequestException('You already have an active order');
    }

    // Update driver status to in_ride
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { status: DriverStatus.in_ride },
    });

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        driverId,
        status: OrderStatus.DriverAccepted,
        acceptedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            presetAvatarNumber: true,
          },
        },
        service: true,
      },
    });

    return {
      id: updatedOrder.id,
      status: updatedOrder.status,
      pickupAddress: updatedOrder.pickupAddress,
      pickupLatitude: updatedOrder.pickupLatitude,
      pickupLongitude: updatedOrder.pickupLongitude,
      dropoffAddress: updatedOrder.dropoffAddress,
      dropoffLatitude: updatedOrder.dropoffLatitude,
      dropoffLongitude: updatedOrder.dropoffLongitude,
      customer: updatedOrder.customer,
      service: {
        id: updatedOrder.service.id,
        name: updatedOrder.service.name,
      },
      acceptedAt: updatedOrder.acceptedAt,
    };
  }

  // Reject an order (before accepting)
  async rejectOrder(driverId: number, orderId: number, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Driver can only reject orders that are being offered to them
    // In a real system, this would check if the order was offered to this driver
    if (order.status !== OrderStatus.Requested) {
      throw new BadRequestException('Cannot reject this order');
    }

    // Log the rejection (could be stored in a separate table for analytics)
    // For now, we just return success - the order stays available for other drivers

    return { message: 'Order rejected', orderId };
  }

  // Arrived at pickup location
  async arrivedAtPickup(driverId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.DriverAccepted) {
      throw new BadRequestException('Cannot mark as arrived from current status');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.Arrived,
        arrivedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
          },
        },
        service: true,
      },
    });

    // Notify rider via socket
    this.socketService.emitToOrder(orderId, 'order:status', {
      orderId,
      status: 'Arrived',
    });

    return {
      id: updatedOrder.id,
      status: updatedOrder.status,
      arrivedAt: updatedOrder.arrivedAt,
    };
  }

  // Start the ride
  async startRide(driverId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.Arrived) {
      throw new BadRequestException('Cannot start ride from current status');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.Started,
        startedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
          },
        },
        service: true,
      },
    });

    // Notify rider via socket
    this.socketService.emitToOrder(orderId, 'order:status', {
      orderId,
      status: 'Started',
    });

    return {
      id: updatedOrder.id,
      status: updatedOrder.status,
      startedAt: updatedOrder.startedAt,
    };
  }

  // Complete the ride
  async completeRide(driverId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.Started) {
      throw new BadRequestException('Cannot complete ride from current status');
    }

    // Calculate final fare (could include waiting time, tolls, etc.)
    const finalCost = order.costAfterCoupon || order.costBest;

    // Update order to finished
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.Finished,
        finishedAt: new Date(),
        paidAmount: finalCost,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        service: true,
      },
    });

    // Set driver back to online
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { status: DriverStatus.online },
    });

    // Notify rider via socket
    this.socketService.emitToOrder(orderId, 'order:status', {
      orderId,
      status: 'Finished',
      paidAmount: updatedOrder.paidAmount,
    });

    return {
      id: updatedOrder.id,
      status: updatedOrder.status,
      paidAmount: updatedOrder.paidAmount,
      tipAmount: updatedOrder.tipAmount,
      finishedAt: updatedOrder.finishedAt,
    };
  }

  // Cancel the order (by driver)
  async cancelOrder(driverId: number, orderId: number, reasonId?: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Can only cancel if order is accepted, arrived, or started
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.DriverAccepted,
      OrderStatus.Arrived,
      OrderStatus.Started,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DriverCanceled,
        cancelReasonId: reasonId,
      },
    });

    // Set driver back to online
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { status: DriverStatus.online },
    });

    // Notify rider via socket
    this.socketService.emitToOrder(orderId, 'order:cancelled', {
      orderId,
      cancelledBy: 'driver',
    });

    // Notify admins
    this.socketService.notifyAdmins('order:cancelled', {
      orderId,
      cancelledBy: 'driver',
      driverId,
    });

    return { message: 'Order canceled successfully' };
  }

  // Get cancel reasons for driver
  async getCancelReasons() {
    const reasons = await this.prisma.orderCancelReason.findMany({
      where: {
        isActive: true,
        isForDriver: true,
      },
    });

    return reasons.map((r) => ({
      id: r.id,
      title: r.title,
    }));
  }

  // Get order details
  async getOrderDetails(driverId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            presetAvatarNumber: true,
          },
        },
        service: true,
        coupon: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      status: order.status,
      pickupAddress: order.pickupAddress,
      pickupLatitude: order.pickupLatitude,
      pickupLongitude: order.pickupLongitude,
      dropoffAddress: order.dropoffAddress,
      dropoffLatitude: order.dropoffLatitude,
      dropoffLongitude: order.dropoffLongitude,
      distanceMeters: order.distanceMeters,
      durationSeconds: order.durationSeconds,
      costBest: order.costBest,
      costAfterCoupon: order.costAfterCoupon,
      paidAmount: order.paidAmount,
      tipAmount: order.tipAmount,
      currency: order.currency,
      paymentMode: order.paymentMode,
      waitMinutes: order.waitMinutes,
      customer: order.customer,
      service: {
        id: order.service.id,
        name: order.service.name,
      },
      coupon: order.coupon
        ? {
            id: order.coupon.id,
            code: order.coupon.code,
          }
        : null,
      acceptedAt: order.acceptedAt,
      arrivedAt: order.arrivedAt,
      startedAt: order.startedAt,
      finishedAt: order.finishedAt,
      createdAt: order.createdAt,
    };
  }

  // ========== Chat/Messages ==========

  // Get chat messages for an order
  async getMessages(driverId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const messages = await this.prisma.orderMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      sentByDriver: m.sentByDriver,
      createdAt: m.createdAt,
    }));
  }

  // Send a message
  async sendMessage(driverId: number, orderId: number, content: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Can only send messages during active order
    const activeStatuses: OrderStatus[] = [
      OrderStatus.DriverAccepted,
      OrderStatus.Arrived,
      OrderStatus.Started,
    ];

    if (!activeStatuses.includes(order.status)) {
      throw new BadRequestException('Cannot send messages for this order');
    }

    const message = await this.prisma.orderMessage.create({
      data: {
        orderId,
        content,
        sentByDriver: true,
      },
    });

    return {
      id: message.id,
      content: message.content,
      sentByDriver: message.sentByDriver,
      createdAt: message.createdAt,
    };
  }
}
