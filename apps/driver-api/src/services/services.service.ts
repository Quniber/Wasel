import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  // Get all available services
  async getAllServices() {
    const services = await this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      include: {
        category: true,
        media: true,
      },
    });

    return services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      baseFare: Number(s.baseFare),
      perHundredMeters: Number(s.perHundredMeters),
      perMinuteDrive: Number(s.perMinuteDrive),
      perMinuteWait: Number(s.perMinuteWait),
      minimumFare: Number(s.minimumFare),
      personCapacity: s.personCapacity,
      category: s.category
        ? {
            id: s.category.id,
            name: s.category.name,
          }
        : null,
      media: s.media
        ? {
            id: s.media.id,
            address: s.media.address,
          }
        : null,
    }));
  }

  // Get driver's enabled services
  async getMyServices(driverId: number) {
    // Get all active services
    const allServices = await this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      include: {
        category: true,
        media: true,
      },
    });

    // Get driver's enabled services
    const driverServices = await this.prisma.driverService.findMany({
      where: { driverId },
    });

    const enabledServiceIds = driverServices.map((ds) => ds.serviceId);

    return allServices.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      baseFare: Number(s.baseFare),
      minimumFare: Number(s.minimumFare),
      personCapacity: s.personCapacity,
      category: s.category
        ? {
            id: s.category.id,
            name: s.category.name,
          }
        : null,
      media: s.media
        ? {
            id: s.media.id,
            address: s.media.address,
          }
        : null,
      isEnabled: enabledServiceIds.includes(s.id),
    }));
  }

  // Enable/disable services for driver
  async updateMyServices(driverId: number, serviceIds: number[]) {
    // Verify all services exist and are active
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true,
      },
    });

    if (services.length !== serviceIds.length) {
      throw new NotFoundException('One or more services not found or inactive');
    }

    // Remove all existing driver services
    await this.prisma.driverService.deleteMany({
      where: { driverId },
    });

    // Create new driver services
    if (serviceIds.length > 0) {
      await this.prisma.driverService.createMany({
        data: serviceIds.map((serviceId) => ({
          driverId,
          serviceId,
        })),
      });
    }

    // Return updated list
    return this.getMyServices(driverId);
  }

  // Toggle a single service
  async toggleService(driverId: number, serviceId: number, enabled: boolean) {
    // Verify service exists and is active
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, isActive: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found or inactive');
    }

    if (enabled) {
      // Enable service
      await this.prisma.driverService.upsert({
        where: {
          driverId_serviceId: {
            driverId,
            serviceId,
          },
        },
        create: {
          driverId,
          serviceId,
        },
        update: {},
      });
    } else {
      // Disable service
      await this.prisma.driverService.deleteMany({
        where: {
          driverId,
          serviceId,
        },
      });
    }

    return {
      serviceId,
      enabled,
      message: enabled ? 'Service enabled' : 'Service disabled',
    };
  }
}
