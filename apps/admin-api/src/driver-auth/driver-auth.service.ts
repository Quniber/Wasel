import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SocketGateway } from '../socket/socket.gateway';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DriverAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private socketGateway: SocketGateway,
  ) {}

  async login(identifier: string, password: string) {
    // Try to find by email first, then by mobile number
    let driver = await this.prisma.driver.findUnique({
      where: { email: identifier },
    });

    if (!driver) {
      driver = await this.prisma.driver.findUnique({
        where: { mobileNumber: identifier },
      });
    }

    if (!driver) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!driver.password) {
      throw new UnauthorizedException('Please set your password first');
    }

    const isPasswordValid = await bcrypt.compare(password, driver.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign({
      sub: driver.id,
      type: 'driver',
      mobileNumber: driver.mobileNumber,
    });

    return {
      accessToken,
      driver: this.sanitizeDriver(driver),
    };
  }

  async register(data: {
    firstName: string;
    lastName: string;
    mobileNumber: string;
    password: string;
    email?: string;
    carPlate?: string;
  }) {
    // Check if driver already exists
    const existingDriver = await this.prisma.driver.findUnique({
      where: { mobileNumber: data.mobileNumber },
    });

    if (existingDriver) {
      throw new ConflictException('A driver with this mobile number already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create driver
    const driver = await this.prisma.driver.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNumber: data.mobileNumber,
        password: hashedPassword,
        email: data.email,
        carPlate: data.carPlate,
        status: 'pending_approval',
      },
    });

    const accessToken = this.jwtService.sign({
      sub: driver.id,
      type: 'driver',
      mobileNumber: driver.mobileNumber,
    });

    return {
      accessToken,
      driver: this.sanitizeDriver(driver),
    };
  }

  async getProfile(driverId: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        fleet: true,
        carModel: true,
        carColor: true,
      },
    });

    if (!driver) {
      throw new UnauthorizedException('Driver not found');
    }

    return this.sanitizeDriver(driver);
  }

  async updateProfile(driverId: number, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    carPlate?: string;
  }) {
    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data,
    });

    return this.sanitizeDriver(driver);
  }

  async updateLocation(driverId: number, latitude: number, longitude: number) {
    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        latitude,
        longitude,
      },
    });

    return { latitude: driver.latitude, longitude: driver.longitude };
  }

  async getOrders(driverId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { driverId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, mobileNumber: true },
          },
          service: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.order.count({ where: { driverId } }),
    ]);

    return {
      orders: orders.map(order => ({
        id: order.id,
        status: order.status,
        pickupAddress: order.pickupAddress,
        dropoffAddress: order.dropoffAddress,
        serviceCost: Number(order.serviceCost) || 0,
        paidAmount: Number(order.paidAmount) || 0,
        currency: order.currency,
        createdAt: order.createdAt,
        finishedAt: order.finishedAt,
        customer: order.customer,
        service: order.service,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async setOnlineStatus(driverId: number, isOnline: boolean) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new UnauthorizedException('Driver not found');
    }

    // Only allow online/offline for drivers not in pending states
    const blockedStatuses = ['waiting_documents', 'pending_approval', 'soft_reject', 'hard_reject', 'blocked'];
    if (blockedStatuses.includes(driver.status) && isOnline) {
      throw new BadRequestException('Your account is not approved yet');
    }

    const newStatus = isOnline ? 'online' : 'offline';
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { status: newStatus },
    });

    // Get count of online drivers for dashboard update
    const onlineDriversCount = await this.prisma.driver.count({
      where: { status: 'online' },
    });

    // Emit WebSocket event to update admin dashboard in real-time
    if (isOnline) {
      this.socketGateway.emitToDashboard('driver:connected', {
        driverId,
        onlineDriversCount,
      });
    } else {
      this.socketGateway.emitToDashboard('driver:disconnected', {
        driverId,
        onlineDriversCount,
      });
    }

    return { isOnline };
  }

  private sanitizeDriver(driver: any) {
    const { password, ...rest } = driver;
    // Driver is approved if not in a blocked/pending status
    const blockedStatuses = ['waiting_documents', 'pending_approval', 'soft_reject', 'hard_reject', 'blocked'];
    return {
      ...rest,
      isApproved: !blockedStatuses.includes(rest.status),
      isOnline: rest.status === 'online',
    };
  }
}
