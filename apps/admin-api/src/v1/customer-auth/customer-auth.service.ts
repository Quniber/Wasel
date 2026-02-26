import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DispatchService } from '../socket/dispatch.service';
import { OrderStatus } from 'database';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomerAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private dispatchService: DispatchService,
  ) {}

  async login(identifier: string, password: string) {
    // Try to find by email first, then by mobile number
    let customer = await this.prisma.customer.findUnique({
      where: { email: identifier },
    });

    if (!customer) {
      customer = await this.prisma.customer.findUnique({
        where: { mobileNumber: identifier },
      });
    }

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!customer.password) {
      throw new UnauthorizedException('Please set your password first');
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign({
      sub: customer.id,
      type: 'customer',
      mobileNumber: customer.mobileNumber,
    });

    return {
      accessToken,
      customer: this.sanitizeCustomer(customer),
    };
  }

  async register(data: {
    firstName: string;
    lastName: string;
    mobileNumber: string;
    password: string;
    email?: string;
  }) {
    // Check if customer already exists
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { mobileNumber: data.mobileNumber },
    });

    if (existingCustomer) {
      throw new ConflictException('A customer with this mobile number already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create customer
    const customer = await this.prisma.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNumber: data.mobileNumber,
        password: hashedPassword,
        email: data.email,
      },
    });

    const accessToken = this.jwtService.sign({
      sub: customer.id,
      type: 'customer',
      mobileNumber: customer.mobileNumber,
    });

    return {
      accessToken,
      customer: this.sanitizeCustomer(customer),
    };
  }

  async getProfile(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    return this.sanitizeCustomer(customer);
  }

  async updateProfile(customerId: number, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data,
    });

    return this.sanitizeCustomer(customer);
  }

  async requestRide(customerId: number, data: {
    serviceId: number;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
  }) {
    // Verify service exists
    const service = await this.prisma.service.findUnique({
      where: { id: data.serviceId },
    });
    if (!service) {
      throw new BadRequestException('Service not found');
    }

    // Calculate estimated cost
    const estimatedCost = Number(service.baseFare) + Number(service.minimumFare || 0);

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

    // Create the order
    const order = await this.prisma.order.create({
      data: {
        customerId,
        serviceId: data.serviceId,
        status: OrderStatus.Requested,
        addresses,
        points: JSON.stringify([]),
        pickupAddress: data.pickupAddress,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        dropoffAddress: data.dropoffAddress,
        dropoffLatitude: data.dropoffLatitude,
        dropoffLongitude: data.dropoffLongitude,
        expectedTimestamp: new Date(),
        serviceCost: estimatedCost,
        currency: 'USD',
      },
      include: {
        customer: true,
        driver: true,
        service: true,
      },
    });

    // Create activity log
    await this.prisma.orderActivity.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: 'Ride requested by customer',
      },
    });

    // Dispatch to nearby drivers
    await this.dispatchService.dispatchOrder(order.id);

    return {
      id: order.id,
      status: order.status,
      pickupAddress: order.pickupAddress,
      dropoffAddress: order.dropoffAddress,
      serviceCost: Number(order.serviceCost),
      currency: order.currency,
      driver: null,
    };
  }

  async getActiveOrder(customerId: number) {
    const activeStatuses = [
      OrderStatus.Requested,
      OrderStatus.Booked,
      OrderStatus.DriverAccepted,
      OrderStatus.Arrived,
      OrderStatus.Started,
    ];

    const order = await this.prisma.order.findFirst({
      where: {
        customerId,
        status: { in: activeStatuses },
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            carPlate: true,
            latitude: true,
            longitude: true,
          },
        },
        service: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      status: order.status,
      pickupAddress: order.pickupAddress,
      dropoffAddress: order.dropoffAddress,
      serviceCost: Number(order.serviceCost),
      currency: order.currency,
      driver: order.driver,
      createdAt: order.createdAt,
    };
  }

  async cancelOrder(customerId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status === OrderStatus.Finished) {
      throw new BadRequestException('Cannot cancel a finished order');
    }

    if (order.status === OrderStatus.Started) {
      throw new BadRequestException('Cannot cancel an order in progress');
    }

    await this.prisma.orderActivity.create({
      data: {
        orderId,
        status: OrderStatus.RiderCanceled,
        note: 'Cancelled by customer',
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.RiderCanceled,
        canceledAt: new Date(),
      },
    });

    return { message: 'Order cancelled successfully' };
  }

  async getOrders(customerId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mobileNumber: true,
              carPlate: true,
              latitude: true,
              longitude: true,
            },
          },
          service: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.order.count({ where: { customerId } }),
    ]);

    return {
      orders: orders.map(order => ({
        id: order.id,
        status: order.status,
        pickupAddress: order.pickupAddress,
        dropoffAddress: order.dropoffAddress,
        serviceCost: Number(order.serviceCost) || 0,
        currency: order.currency,
        createdAt: order.createdAt,
        finishedAt: order.finishedAt,
        driver: order.driver,
        service: order.service,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private sanitizeCustomer(customer: any) {
    const { password, ...rest } = customer;
    return {
      ...rest,
      walletBalance: Number(rest.walletBalance || 0),
    };
  }

  async getServices() {
    const services = await this.prisma.service.findMany({
      where: { isActive: true },
      include: {
        media: true,
      },
      orderBy: { name: 'asc' },
    });

    return services.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      baseFare: Number(service.baseFare),
      perKilometer: Number(service.perKilometer || 0),
      perMinuteDrive: Number(service.perMinuteDrive || 0),
      minimumFare: Number(service.minimumFare || 0),
      currency: service.currency || 'QAR',
      media: service.media?.address || null,
    }));
  }
}
