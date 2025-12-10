import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  // Services
  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.service.findMany({
      where,
      orderBy: { displayPriority: 'asc' },
      include: {
        category: true,
        media: true,
        _count: {
          select: { orders: true, drivers: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        media: true,
        options: true,
        zonePrices: true,
        regions: { include: { region: true } },
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async create(data: {
    name: string;
    description?: string;
    categoryId?: number;
    baseFare: number;
    perKilometer?: number;
    perHundredMeters?: number;
    perMinuteDrive: number;
    perMinuteWait?: number;
    minimumFare?: number;
    cancellationFee?: number;
    cancellationDriverShare?: number;
    providerSharePercent?: number;
    providerShareFlat?: number;
    personCapacity?: number;
    searchRadius?: number;
    prepayPercent?: number;
    twoWayAvailable?: boolean;
    availableTimeFrom?: string;
    availableTimeTo?: string;
    displayPriority?: number;
    currency?: string;
    isActive?: boolean;
  }) {
    return this.prisma.service.create({
      data,
      include: { category: true },
    });
  }

  async update(id: number, data: {
    name?: string;
    description?: string;
    categoryId?: number;
    baseFare?: number;
    perKilometer?: number;
    perHundredMeters?: number;
    perMinuteDrive?: number;
    perMinuteWait?: number;
    minimumFare?: number;
    cancellationFee?: number;
    cancellationDriverShare?: number;
    providerSharePercent?: number;
    providerShareFlat?: number;
    personCapacity?: number;
    searchRadius?: number;
    prepayPercent?: number;
    twoWayAvailable?: boolean;
    availableTimeFrom?: string;
    availableTimeTo?: string;
    displayPriority?: number;
    currency?: string;
    isActive?: boolean;
  }) {
    await this.findOne(id);
    return this.prisma.service.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.service.delete({ where: { id } });
  }

  async toggleActive(id: number, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.service.update({
      where: { id },
      data: { isActive },
    });
  }

  // Service Options
  async getOptions(serviceId: number) {
    await this.findOne(serviceId);
    return this.prisma.serviceOption.findMany({
      where: { serviceId },
      orderBy: { name: 'asc' },
    });
  }

  async addOption(serviceId: number, data: {
    name: string;
    description?: string;
    icon?: string;
    price: number;
    isActive?: boolean;
  }) {
    await this.findOne(serviceId);
    return this.prisma.serviceOption.create({
      data: {
        serviceId,
        ...data,
      },
    });
  }

  async updateOption(optionId: number, data: {
    name?: string;
    description?: string;
    icon?: string;
    price?: number;
    isActive?: boolean;
  }) {
    const option = await this.prisma.serviceOption.findUnique({ where: { id: optionId } });
    if (!option) throw new NotFoundException('Option not found');
    return this.prisma.serviceOption.update({
      where: { id: optionId },
      data,
    });
  }

  async removeOption(optionId: number) {
    const option = await this.prisma.serviceOption.findUnique({ where: { id: optionId } });
    if (!option) throw new NotFoundException('Option not found');
    return this.prisma.serviceOption.delete({ where: { id: optionId } });
  }

  // Zone Prices
  async getZonePrices(serviceId: number) {
    await this.findOne(serviceId);
    return this.prisma.zonePrice.findMany({
      where: { serviceId },
    });
  }

  async addZonePrice(serviceId: number, data: {
    name: string;
    fromPolygon: string;
    toPolygon: string;
    price: number;
    isActive?: boolean;
  }) {
    await this.findOne(serviceId);
    return this.prisma.zonePrice.create({
      data: {
        serviceId,
        ...data,
      },
    });
  }

  async updateZonePrice(zonePriceId: number, data: {
    name?: string;
    fromPolygon?: string;
    toPolygon?: string;
    price?: number;
    isActive?: boolean;
  }) {
    const zonePrice = await this.prisma.zonePrice.findUnique({ where: { id: zonePriceId } });
    if (!zonePrice) throw new NotFoundException('Zone price not found');
    return this.prisma.zonePrice.update({
      where: { id: zonePriceId },
      data,
    });
  }

  async removeZonePrice(zonePriceId: number) {
    const zonePrice = await this.prisma.zonePrice.findUnique({ where: { id: zonePriceId } });
    if (!zonePrice) throw new NotFoundException('Zone price not found');
    return this.prisma.zonePrice.delete({ where: { id: zonePriceId } });
  }

  // Service Categories
  async getCategories() {
    return this.prisma.serviceCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { services: true } },
      },
    });
  }

  async createCategory(data: {
    name: string;
    description?: string;
    iconUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.serviceCategory.create({ data });
  }

  async updateCategory(id: number, data: {
    name?: string;
    description?: string;
    iconUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const category = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return this.prisma.serviceCategory.update({
      where: { id },
      data,
    });
  }

  async removeCategory(id: number) {
    const category = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return this.prisma.serviceCategory.delete({ where: { id } });
  }

  // Regions
  async getRegions() {
    return this.prisma.region.findMany({
      include: {
        _count: { select: { services: true, orders: true } },
      },
    });
  }

  async createRegion(data: {
    name: string;
    currency?: string;
    polygon: string;
    isEnabled?: boolean;
  }) {
    return this.prisma.region.create({ data });
  }

  async updateRegion(id: number, data: {
    name?: string;
    currency?: string;
    polygon?: string;
    isEnabled?: boolean;
  }) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return this.prisma.region.update({
      where: { id },
      data,
    });
  }

  async removeRegion(id: number) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return this.prisma.region.delete({ where: { id } });
  }

  // Service-Region mapping
  async addServiceToRegion(serviceId: number, regionId: number) {
    return this.prisma.serviceRegion.create({
      data: { serviceId, regionId },
    });
  }

  async removeServiceFromRegion(serviceId: number, regionId: number) {
    return this.prisma.serviceRegion.deleteMany({
      where: { serviceId, regionId },
    });
  }
}
