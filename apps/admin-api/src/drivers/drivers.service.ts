import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriverStatus, DocumentStatus, TransactionType, TransactionAction } from 'database';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    status?: DriverStatus,
    fleetId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { mobileNumber: { contains: search } },
        { carPlate: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (fleetId) {
      where.fleetId = fleetId;
    }

    const [drivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          carModel: true,
          carColor: true,
          fleet: { select: { id: true, name: true } },
        },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return { drivers, total, page, limit };
  }

  async findAllWithLocations(status?: DriverStatus) {
    const where: any = {
      // Only get drivers that have location data
      latitude: { not: null },
      longitude: { not: null },
    };

    if (status) {
      where.status = status;
    }

    const [drivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobileNumber: true,
          email: true,
          status: true,
          carPlate: true,
          latitude: true,
          longitude: true,
          lastSeenAt: true,
          rating: true,
          reviewCount: true,
          carModel: { select: { id: true, model: true, brand: true } },
          carColor: { select: { id: true, name: true } },
          fleet: { select: { id: true, name: true } },
        },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return { drivers, total, page: 1, limit: total };
  }

  async findOne(id: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        carModel: true,
        carColor: true,
        fleet: true,
        documents: {
          include: {
            documentType: true,
            media: true,
          },
        },
        enabledServices: {
          include: { service: true },
        },
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email?: string;
    mobileNumber: string;
    password?: string;
    carPlate?: string;
    carModelId?: number;
    carColorId?: number;
    fleetId?: number;
  }) {
    // Generate a random password if not provided (for admin-created drivers)
    const password = data.password || Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.driver.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        password: hashedPassword,
        carPlate: data.carPlate,
        carModelId: data.carModelId,
        carColorId: data.carColorId,
        fleetId: data.fleetId,
      },
      include: {
        carModel: true,
        carColor: true,
        fleet: true,
      },
    });
  }

  async update(id: number, data: {
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    carPlate?: string;
    carModelId?: number;
    carColorId?: number;
    carProductionYear?: number;
    fleetId?: number;
    status?: DriverStatus;
    softRejectionNote?: string;
  }) {
    await this.findOne(id);
    return this.prisma.driver.update({
      where: { id },
      data,
      include: {
        carModel: true,
        carColor: true,
        fleet: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.driver.delete({ where: { id } });
  }

  // Document Management
  async getDocuments(driverId: number) {
    await this.findOne(driverId);
    return this.prisma.driverDocument.findMany({
      where: { driverId },
      include: {
        documentType: true,
        media: true,
        verifiedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async verifyDocument(documentId: number, operatorId: number) {
    const doc = await this.prisma.driverDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.driverDocument.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.approved,
        verifiedAt: new Date(),
        verifiedById: operatorId,
        rejectionNote: null,
      },
      include: { documentType: true, media: true },
    });
  }

  async rejectDocument(documentId: number, operatorId: number, rejectionNote: string) {
    const doc = await this.prisma.driverDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.driverDocument.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.rejected,
        verifiedAt: new Date(),
        verifiedById: operatorId,
        rejectionNote,
      },
      include: { documentType: true, media: true },
    });
  }

  // Wallet Management
  async getWallet(driverId: number) {
    const driver = await this.findOne(driverId);
    const transactions = await this.prisma.driverTransaction.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        order: { select: { id: true, status: true } },
      },
    });

    return {
      balance: driver.walletBalance,
      transactions,
    };
  }

  async adjustWallet(
    driverId: number,
    amount: number,
    type: TransactionType,
    description: string,
  ) {
    await this.findOne(driverId);

    const [transaction] = await this.prisma.$transaction([
      this.prisma.driverTransaction.create({
        data: {
          driverId,
          type,
          action: TransactionAction.adjustment,
          amount,
          description,
        },
      }),
      this.prisma.driver.update({
        where: { id: driverId },
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
  async getOrders(driverId: number, page = 1, limit = 20) {
    await this.findOne(driverId);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { driverId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          service: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.count({ where: { driverId } }),
    ]);

    return { orders, total, page, limit };
  }

  // Stats
  async getStats(driverId: number) {
    const driver = await this.findOne(driverId);

    const [totalOrders, completedOrders, cancelledOrders, totalEarnings] = await Promise.all([
      this.prisma.order.count({ where: { driverId } }),
      this.prisma.order.count({ where: { driverId, status: 'Finished' } }),
      this.prisma.order.count({
        where: { driverId, status: { in: ['DriverCanceled', 'RiderCanceled'] } },
      }),
      this.prisma.driverTransaction.aggregate({
        where: { driverId, type: TransactionType.credit },
        _sum: { amount: true },
      }),
    ]);

    return {
      rating: driver.rating,
      reviewCount: driver.reviewCount,
      totalOrders,
      completedOrders,
      cancelledOrders,
      acceptanceRate: driver.acceptedOrdersCount + driver.rejectedOrdersCount > 0
        ? (driver.acceptedOrdersCount / (driver.acceptedOrdersCount + driver.rejectedOrdersCount) * 100).toFixed(1)
        : 100,
      totalEarnings: Number(totalEarnings._sum.amount || 0),
    };
  }

  // Services
  async getServices(driverId: number) {
    await this.findOne(driverId);
    return this.prisma.driverService.findMany({
      where: { driverId },
      include: { service: true },
    });
  }

  async toggleService(driverId: number, serviceId: number, isEnabled: boolean) {
    await this.findOne(driverId);

    return this.prisma.driverService.upsert({
      where: {
        driverId_serviceId: { driverId, serviceId },
      },
      create: {
        driverId,
        serviceId,
        isEnabled,
      },
      update: {
        isEnabled,
      },
      include: { service: true },
    });
  }

  // Notes
  async getNotes(driverId: number) {
    await this.findOne(driverId);
    return this.prisma.driverNote.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      include: {
        operator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addNote(driverId: number, operatorId: number, note: string) {
    await this.findOne(driverId);
    return this.prisma.driverNote.create({
      data: {
        driverId,
        operatorId,
        note,
      },
      include: {
        operator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // Upload Document
  async uploadDocument(
    driverId: number,
    documentTypeId: number,
    fileUrl: string,
    fileName: string,
    mimeType?: string,
    expiryDate?: Date,
  ) {
    await this.findOne(driverId);

    // First create the media record
    const media = await this.prisma.media.create({
      data: {
        fileName,
        address: fileUrl,
        mimeType,
      },
    });

    // Then create the document record
    return this.prisma.driverDocument.create({
      data: {
        driverId,
        documentTypeId,
        mediaId: media.id,
        expiryDate,
        status: DocumentStatus.pending,
      },
      include: {
        documentType: true,
        media: true,
      },
    });
  }

  // Create driver with documents (for registration)
  async createWithDocuments(
    driverData: {
      firstName: string;
      lastName: string;
      email?: string;
      mobileNumber: string;
      password?: string;
      carPlate?: string;
      carModelId?: number;
      carColorId?: number;
      fleetId?: number;
    },
    documents?: Array<{
      documentTypeId: number;
      fileUrl: string;
      fileName: string;
      mimeType?: string;
      expiryDate?: Date;
    }>,
  ) {
    // Generate a random password if not provided
    const password = driverData.password || Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Create driver in a transaction with documents
      return await this.prisma.$transaction(async (tx) => {
        const driver = await tx.driver.create({
          data: {
            firstName: driverData.firstName,
            lastName: driverData.lastName,
            email: driverData.email || null,
            mobileNumber: driverData.mobileNumber,
            password: hashedPassword,
            carPlate: driverData.carPlate,
            carModelId: driverData.carModelId || null,
            carColorId: driverData.carColorId || null,
            fleetId: driverData.fleetId || null,
          },
        });

        // Create documents if provided
        if (documents && documents.length > 0) {
          for (const doc of documents) {
            const media = await tx.media.create({
              data: {
                fileName: doc.fileName,
                address: doc.fileUrl,
                mimeType: doc.mimeType,
              },
            });

            await tx.driverDocument.create({
              data: {
                driverId: driver.id,
                documentTypeId: doc.documentTypeId,
                mediaId: media.id,
                expiryDate: doc.expiryDate,
                status: DocumentStatus.pending,
              },
            });
          }
        }

        // Return driver with all relations
        return tx.driver.findUnique({
          where: { id: driver.id },
          include: {
            carModel: true,
            carColor: true,
            fleet: true,
            documents: {
              include: {
                documentType: true,
                media: true,
              },
            },
          },
        });
      });
    } catch (error) {
      console.error('Error creating driver with documents:', error);
      throw error;
    }
  }
}
