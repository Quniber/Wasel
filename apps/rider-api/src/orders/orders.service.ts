import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentMode } from 'database';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // Get available services
  async getServices() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { displayPriority: 'asc' },
      include: {
        category: true,
        media: true,
      },
    });
  }

  // Calculate fare estimate before booking
  async calculateFare(data: {
    serviceId: number;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffLatitude: number;
    dropoffLongitude: number;
  }) {
    const service = await this.prisma.service.findUnique({
      where: { id: data.serviceId },
    });

    if (!service || !service.isActive) {
      throw new BadRequestException('Service not available');
    }

    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(
      data.pickupLatitude,
      data.pickupLongitude,
      data.dropoffLatitude,
      data.dropoffLongitude,
    );

    // Estimate duration (rough estimate: 30km/h average in city)
    const estimatedDuration = Math.round((distance / 30) * 60); // minutes

    // Calculate fare
    const distanceInHundredMeters = distance * 10; // Convert km to 100m units
    const baseFare = Number(service.baseFare);
    const distanceCost = distanceInHundredMeters * Number(service.perHundredMeters);
    const timeCost = estimatedDuration * Number(service.perMinuteDrive);

    let totalFare = baseFare + distanceCost + timeCost;

    // Apply minimum fare
    const minimumFare = Number(service.minimumFare);
    if (totalFare < minimumFare) {
      totalFare = minimumFare;
    }

    return {
      service: {
        id: service.id,
        name: service.name,
        personCapacity: service.personCapacity,
      },
      distance: Math.round(distance * 100) / 100, // km with 2 decimal places
      estimatedDuration, // minutes
      breakdown: {
        baseFare,
        distanceCost: Math.round(distanceCost * 100) / 100,
        timeCost: Math.round(timeCost * 100) / 100,
        minimumFare,
      },
      estimatedFare: Math.round(totalFare * 100) / 100,
      currency: 'USD',
    };
  }

  // Create a new order
  async create(
    customerId: number,
    data: {
      serviceId: number;
      pickupAddress: string;
      pickupLatitude: number;
      pickupLongitude: number;
      dropoffAddress: string;
      dropoffLatitude: number;
      dropoffLongitude: number;
      couponCode?: string;
      paymentMode?: string;
      scheduledAt?: string;
    },
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: data.serviceId },
    });

    if (!service || !service.isActive) {
      throw new BadRequestException('Service not available');
    }

    // Calculate fare
    const fareEstimate = await this.calculateFare({
      serviceId: data.serviceId,
      pickupLatitude: data.pickupLatitude,
      pickupLongitude: data.pickupLongitude,
      dropoffLatitude: data.dropoffLatitude,
      dropoffLongitude: data.dropoffLongitude,
    });

    // Handle coupon if provided
    let couponId: number | null = null;
    let costAfterCoupon = fareEstimate.estimatedFare;

    if (data.couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          code: data.couponCode,
          isEnabled: true,
          startAt: { lte: new Date() },
          OR: [
            { expireAt: null },
            { expireAt: { gte: new Date() } },
          ],
        },
      });

      if (coupon) {
        couponId = coupon.id;
        // Apply discount - check if flat discount or percent
        const isFlat = Number(coupon.discountFlat) > 0;
        if (isFlat) {
          costAfterCoupon = Math.max(0, fareEstimate.estimatedFare - Number(coupon.discountFlat));
        } else {
          const discount = (fareEstimate.estimatedFare * coupon.discountPercent) / 100;
          const maxDiscount = Number(coupon.maximumCost) || discount;
          costAfterCoupon = fareEstimate.estimatedFare - Math.min(discount, maxDiscount);
        }
      }
    }

    // Build addresses JSON
    const addresses = JSON.stringify([
      {
        type: 'pickup',
        address: data.pickupAddress,
        latitude: data.pickupLatitude,
        longitude: data.pickupLongitude,
      },
      {
        type: 'dropoff',
        address: data.dropoffAddress,
        latitude: data.dropoffLatitude,
        longitude: data.dropoffLongitude,
      },
    ]);

    // Determine payment mode
    let paymentMode: PaymentMode = PaymentMode.cash;
    if (data.paymentMode === 'wallet') paymentMode = PaymentMode.wallet;
    else if (data.paymentMode === 'saved_payment_method') paymentMode = PaymentMode.saved_payment_method;
    else if (data.paymentMode === 'payment_gateway') paymentMode = PaymentMode.payment_gateway;

    // Create order
    const order = await this.prisma.order.create({
      data: {
        customerId,
        serviceId: data.serviceId,
        couponId,
        status: data.scheduledAt ? OrderStatus.Booked : OrderStatus.Requested,
        addresses,
        points: '[]',
        pickupAddress: data.pickupAddress,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        dropoffAddress: data.dropoffAddress,
        dropoffLatitude: data.dropoffLatitude,
        dropoffLongitude: data.dropoffLongitude,
        distanceMeters: Math.round(fareEstimate.distance * 1000),
        durationSeconds: fareEstimate.estimatedDuration * 60,
        expectedTimestamp: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
        serviceCost: fareEstimate.estimatedFare,
        costAfterCoupon,
        paymentMode,
        currency: 'USD',
      },
      include: {
        service: true,
        coupon: true,
      },
    });

    // Create activity log
    await this.prisma.orderActivity.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: 'Order created by customer',
      },
    });

    return order;
  }

  // Get order history for customer
  async findAll(customerId: number, status?: string, limit = 20, offset = 0) {
    const where: any = { customerId };

    if (status === 'active') {
      where.status = {
        in: [OrderStatus.Requested, OrderStatus.Booked, OrderStatus.DriverAccepted, OrderStatus.Arrived, OrderStatus.Started],
      };
    } else if (status === 'completed') {
      where.status = OrderStatus.Finished;
    } else if (status === 'cancelled') {
      where.status = { in: [OrderStatus.RiderCanceled, OrderStatus.DriverCanceled] };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { id: true, name: true, media: true } },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mobileNumber: true,
              carModel: true,
              carPlate: true,
              carColor: true,
              media: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, limit, offset };
  }

  // Get single order detail
  async findOne(customerId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        service: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            carModel: true,
            carPlate: true,
            carColor: true,
            media: true,
          },
        },
        coupon: true,
        feedback: true,
        riderReview: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // Get current active order (for tracking)
  async getCurrentOrder(customerId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        customerId,
        status: {
          in: [OrderStatus.Requested, OrderStatus.DriverAccepted, OrderStatus.Arrived, OrderStatus.Started],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        service: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            carModel: true,
            carPlate: true,
            carColor: true,
            media: true,
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    return order;
  }

  // Get order tracking info
  async getOrderTracking(customerId: number, orderId: number) {
    const order = await this.findOne(customerId, orderId);

    // Get timeline
    const activities = await this.prisma.orderActivity.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      orderId: order.id,
      status: order.status,
      pickup: {
        address: order.pickupAddress,
        latitude: order.pickupLatitude,
        longitude: order.pickupLongitude,
      },
      dropoff: {
        address: order.dropoffAddress,
        latitude: order.dropoffLatitude,
        longitude: order.dropoffLongitude,
      },
      driverLocation: null, // Driver location is handled by real-time service
      pickupEta: order.pickupEta,
      dropOffEta: order.dropOffEta,
      timeline: activities,
    };
  }

  // Cancel order
  async cancel(customerId: number, orderId: number, cancelReasonId?: number, note?: string) {
    const order = await this.findOne(customerId, orderId);

    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.Requested,
      OrderStatus.Booked,
      OrderStatus.DriverAccepted,
      OrderStatus.Arrived,
    ];
    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    // Log activity
    await this.prisma.orderActivity.create({
      data: {
        orderId,
        status: OrderStatus.RiderCanceled,
        note: note || 'Cancelled by rider',
      },
    });

    // Calculate cancellation fee if applicable
    let cancellationFee = 0;
    if (order.status === OrderStatus.Arrived || order.status === OrderStatus.DriverAccepted) {
      const service = await this.prisma.service.findUnique({
        where: { id: order.serviceId },
      });
      if (service) {
        cancellationFee = Number(service.cancellationFee);
      }
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.RiderCanceled,
        canceledAt: new Date(),
        cancelReasonId,
        cancelReasonNote: note,
      },
      include: {
        service: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // Get cancel reasons
  async getCancelReasons() {
    return this.prisma.orderCancelReason.findMany({
      where: {
        isActive: true,
        isForRider: true,
      },
      orderBy: { title: 'asc' },
    });
  }

  // Rate driver / Submit feedback
  async rateDriver(
    customerId: number,
    orderId: number,
    data: {
      rating: number;
      review?: string;
      parameters?: Record<string, number>;
    },
  ) {
    const order = await this.findOne(customerId, orderId);

    if (order.status !== OrderStatus.Finished) {
      throw new BadRequestException('Can only rate completed orders');
    }

    if (!order.driverId) {
      throw new BadRequestException('Order has no driver to rate');
    }

    // Check if already reviewed
    const existingReview = await this.prisma.riderReview.findUnique({
      where: { orderId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already rated this ride');
    }

    // Create rider review (uses score not rating)
    const review = await this.prisma.riderReview.create({
      data: {
        orderId,
        driverId: order.driverId,
        score: data.rating,
        review: data.review,
      },
    });

    // Update driver rating
    const allReviews = await this.prisma.riderReview.findMany({
      where: { driverId: order.driverId },
    });
    const avgRating = allReviews.reduce((sum, r) => sum + r.score, 0) / allReviews.length;

    await this.prisma.driver.update({
      where: { id: order.driverId },
      data: {
        rating: avgRating,
        reviewCount: allReviews.length,
      },
    });

    return review;
  }

  // Add tip to completed order
  async addTip(customerId: number, orderId: number, amount: number) {
    const order = await this.findOne(customerId, orderId);

    if (order.status !== OrderStatus.Finished) {
      throw new BadRequestException('Can only tip completed orders');
    }

    if (!order.driverId) {
      throw new BadRequestException('Order has no driver to tip');
    }

    if (amount <= 0) {
      throw new BadRequestException('Tip amount must be positive');
    }

    // Update order with tip
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        tipAmount: { increment: amount },
      },
    });

    // Create transaction for driver
    await this.prisma.driverTransaction.create({
      data: {
        driverId: order.driverId,
        orderId,
        type: 'credit',
        action: 'tip',
        amount,
        description: `Tip from rider for order #${orderId}`,
      },
    });

    return {
      message: 'Tip added successfully',
      tipAmount: Number(updatedOrder.tipAmount),
    };
  }

  // Get order messages (chat)
  async getMessages(customerId: number, orderId: number) {
    const order = await this.findOne(customerId, orderId);

    return this.prisma.orderMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Send message
  async sendMessage(customerId: number, orderId: number, content: string) {
    const order = await this.findOne(customerId, orderId);

    const activeStatuses: OrderStatus[] = [OrderStatus.DriverAccepted, OrderStatus.Arrived, OrderStatus.Started];
    if (!activeStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException('Cannot send messages in current order status');
    }

    // sentByDriver = false means sent by rider
    return this.prisma.orderMessage.create({
      data: {
        orderId,
        sentByDriver: false,
        content,
      },
    });
  }

  // Book a scheduled ride
  async scheduleRide(
    customerId: number,
    data: {
      serviceId: number;
      pickupAddress: string;
      pickupLatitude: number;
      pickupLongitude: number;
      dropoffAddress: string;
      dropoffLatitude: number;
      dropoffLongitude: number;
      scheduledAt: string;
      couponCode?: string;
      paymentMode?: string;
    },
  ) {
    // Validate scheduled time (must be at least 30 minutes in the future)
    const scheduledTime = new Date(data.scheduledAt);
    const minScheduleTime = new Date(Date.now() + 30 * 60 * 1000);

    if (scheduledTime < minScheduleTime) {
      throw new BadRequestException('Scheduled time must be at least 30 minutes from now');
    }

    // Use the regular create method with scheduledAt
    return this.create(customerId, {
      ...data,
      scheduledAt: data.scheduledAt,
    });
  }

  // Get scheduled rides for customer
  async getScheduledRides(customerId: number) {
    return this.prisma.order.findMany({
      where: {
        customerId,
        status: OrderStatus.Booked,
        expectedTimestamp: { gte: new Date() },
      },
      orderBy: { expectedTimestamp: 'asc' },
      include: {
        service: { select: { id: true, name: true, media: true } },
      },
    });
  }

  // Cancel a scheduled ride
  async cancelScheduledRide(customerId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
        status: OrderStatus.Booked,
      },
    });

    if (!order) {
      throw new NotFoundException('Scheduled ride not found');
    }

    // Log activity
    await this.prisma.orderActivity.create({
      data: {
        orderId,
        status: OrderStatus.RiderCanceled,
        note: 'Scheduled ride cancelled by rider',
      },
    });

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.RiderCanceled,
        canceledAt: new Date(),
        cancelReasonNote: 'Scheduled ride cancelled by customer',
      },
    });
  }

  // Distance calculation (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
