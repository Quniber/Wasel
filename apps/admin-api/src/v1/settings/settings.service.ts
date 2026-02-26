import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentGatewayType, AnnouncementUserType, DevicePlatform } from 'database';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // === General Settings ===
  async getAllSettings() {
    return this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getSetting(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException('Setting not found');
    return setting;
  }

  async upsertSetting(key: string, value: string, description?: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }

  async deleteSetting(key: string) {
    await this.getSetting(key);
    return this.prisma.setting.delete({ where: { key } });
  }

  // === Car Models ===
  async getCarModels(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.carModel.findMany({
      where,
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
      include: { _count: { select: { drivers: true } } },
    });
  }

  async createCarModel(data: { brand: string; model: string; year?: number; isActive?: boolean }) {
    return this.prisma.carModel.create({ data });
  }

  async updateCarModel(id: number, data: { brand?: string; model?: string; year?: number; isActive?: boolean }) {
    const carModel = await this.prisma.carModel.findUnique({ where: { id } });
    if (!carModel) throw new NotFoundException('Car model not found');
    return this.prisma.carModel.update({ where: { id }, data });
  }

  async deleteCarModel(id: number) {
    const carModel = await this.prisma.carModel.findUnique({ where: { id } });
    if (!carModel) throw new NotFoundException('Car model not found');
    return this.prisma.carModel.delete({ where: { id } });
  }

  // === Car Colors ===
  async getCarColors(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.carColor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { drivers: true } } },
    });
  }

  async createCarColor(data: { name: string; hexCode?: string; isActive?: boolean }) {
    return this.prisma.carColor.create({ data });
  }

  async updateCarColor(id: number, data: { name?: string; hexCode?: string; isActive?: boolean }) {
    const carColor = await this.prisma.carColor.findUnique({ where: { id } });
    if (!carColor) throw new NotFoundException('Car color not found');
    return this.prisma.carColor.update({ where: { id }, data });
  }

  async deleteCarColor(id: number) {
    const carColor = await this.prisma.carColor.findUnique({ where: { id } });
    if (!carColor) throw new NotFoundException('Car color not found');
    return this.prisma.carColor.delete({ where: { id } });
  }

  // === Document Types ===
  async getDocumentTypes(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.documentType.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { documents: true } } },
    });
  }

  async createDocumentType(data: {
    name: string;
    description?: string;
    isRequired?: boolean;
    hasExpiry?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.documentType.create({ data });
  }

  async updateDocumentType(id: number, data: {
    name?: string;
    description?: string;
    isRequired?: boolean;
    hasExpiry?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const docType = await this.prisma.documentType.findUnique({ where: { id } });
    if (!docType) throw new NotFoundException('Document type not found');
    return this.prisma.documentType.update({ where: { id }, data });
  }

  async deleteDocumentType(id: number) {
    const docType = await this.prisma.documentType.findUnique({ where: { id } });
    if (!docType) throw new NotFoundException('Document type not found');
    return this.prisma.documentType.delete({ where: { id } });
  }

  // === Payment Gateways ===
  async getPaymentGateways() {
    return this.prisma.paymentGateway.findMany({
      where: { deletedAt: null },
      orderBy: { title: 'asc' },
      include: { media: true, _count: { select: { orders: true } } },
    });
  }

  async getPaymentGateway(id: number) {
    const gateway = await this.prisma.paymentGateway.findFirst({
      where: { id, deletedAt: null },
      include: { media: true },
    });
    if (!gateway) throw new NotFoundException('Payment gateway not found');
    return gateway;
  }

  async createPaymentGateway(data: {
    type: PaymentGatewayType;
    title: string;
    description?: string;
    publicKey?: string;
    privateKey: string;
    merchantId?: string;
    saltKey?: string;
    mediaId?: number;
    isEnabled?: boolean;
  }) {
    return this.prisma.paymentGateway.create({
      data,
      include: { media: true },
    });
  }

  async updatePaymentGateway(id: number, data: {
    type?: PaymentGatewayType;
    title?: string;
    description?: string;
    publicKey?: string;
    privateKey?: string;
    merchantId?: string;
    saltKey?: string;
    mediaId?: number;
    isEnabled?: boolean;
  }) {
    await this.getPaymentGateway(id);
    return this.prisma.paymentGateway.update({
      where: { id },
      data,
      include: { media: true },
    });
  }

  async deletePaymentGateway(id: number) {
    await this.getPaymentGateway(id);
    return this.prisma.paymentGateway.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // === Coupons ===
  async getCoupons(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true, customers: true } },
          services: { include: { service: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.coupon.count(),
    ]);
    return { coupons, total, page, limit };
  }

  async getCoupon(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        services: { include: { service: true } },
        _count: { select: { orders: true, customers: true } },
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async createCoupon(data: {
    code: string;
    title: string;
    description?: string;
    manyUsersCanUse?: number;
    manyTimesUserCanUse?: number;
    minimumCost?: number;
    maximumCost?: number;
    startAt: Date;
    expireAt?: Date;
    discountPercent?: number;
    discountFlat?: number;
    creditGift?: number;
    isEnabled?: boolean;
    isFirstTravelOnly?: boolean;
    serviceIds?: number[];
  }) {
    const { serviceIds, ...couponData } = data;

    return this.prisma.coupon.create({
      data: {
        ...couponData,
        services: serviceIds ? {
          create: serviceIds.map(serviceId => ({ serviceId })),
        } : undefined,
      },
      include: { services: { include: { service: true } } },
    });
  }

  async updateCoupon(id: number, data: {
    code?: string;
    title?: string;
    description?: string;
    manyUsersCanUse?: number;
    manyTimesUserCanUse?: number;
    minimumCost?: number;
    maximumCost?: number;
    startAt?: Date;
    expireAt?: Date;
    discountPercent?: number;
    discountFlat?: number;
    creditGift?: number;
    isEnabled?: boolean;
    isFirstTravelOnly?: boolean;
    serviceIds?: number[];
  }) {
    await this.getCoupon(id);
    const { serviceIds, ...couponData } = data;

    if (serviceIds !== undefined) {
      await this.prisma.couponService.deleteMany({ where: { couponId: id } });
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...couponData,
        services: serviceIds ? {
          create: serviceIds.map(serviceId => ({ serviceId })),
        } : undefined,
      },
      include: { services: { include: { service: true } } },
    });
  }

  async deleteCoupon(id: number) {
    await this.getCoupon(id);
    return this.prisma.coupon.delete({ where: { id } });
  }

  // === Announcements ===
  async getAnnouncements(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { media: true },
      }),
      this.prisma.announcement.count(),
    ]);
    return { announcements, total, page, limit };
  }

  async getAnnouncement(id: number) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }

  async createAnnouncement(data: {
    title: string;
    description: string;
    url?: string;
    userType?: AnnouncementUserType;
    mediaId?: number;
    startAt: Date;
    expireAt?: Date;
    isActive?: boolean;
  }) {
    return this.prisma.announcement.create({
      data,
      include: { media: true },
    });
  }

  async updateAnnouncement(id: number, data: {
    title?: string;
    description?: string;
    url?: string;
    userType?: AnnouncementUserType;
    mediaId?: number;
    startAt?: Date;
    expireAt?: Date;
    isActive?: boolean;
  }) {
    await this.getAnnouncement(id);
    return this.prisma.announcement.update({
      where: { id },
      data,
      include: { media: true },
    });
  }

  async deleteAnnouncement(id: number) {
    await this.getAnnouncement(id);
    return this.prisma.announcement.delete({ where: { id } });
  }

  // === App Versions ===
  async getAppVersions() {
    return this.prisma.appVersion.findMany({
      orderBy: [{ platform: 'asc' }, { appType: 'asc' }, { versionCode: 'desc' }],
    });
  }

  async getAppVersion(id: number) {
    const version = await this.prisma.appVersion.findUnique({ where: { id } });
    if (!version) throw new NotFoundException('App version not found');
    return version;
  }

  async createAppVersion(data: {
    platform: DevicePlatform;
    appType: string;
    versionCode: number;
    versionName: string;
    releaseNotes?: string;
    forceUpdate?: boolean;
    storeUrl?: string;
  }) {
    return this.prisma.appVersion.create({ data });
  }

  async updateAppVersion(id: number, data: {
    versionCode?: number;
    versionName?: string;
    releaseNotes?: string;
    forceUpdate?: boolean;
    storeUrl?: string;
  }) {
    await this.getAppVersion(id);
    return this.prisma.appVersion.update({ where: { id }, data });
  }

  async deleteAppVersion(id: number) {
    await this.getAppVersion(id);
    return this.prisma.appVersion.delete({ where: { id } });
  }

  // === Cancel Reasons ===
  async getCancelReasons(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.orderCancelReason.findMany({
      where,
      orderBy: { title: 'asc' },
      include: { _count: { select: { orders: true } } },
    });
  }

  async createCancelReason(data: {
    title: string;
    isForDriver?: boolean;
    isForRider?: boolean;
    isActive?: boolean;
  }) {
    return this.prisma.orderCancelReason.create({ data });
  }

  async updateCancelReason(id: number, data: {
    title?: string;
    isForDriver?: boolean;
    isForRider?: boolean;
    isActive?: boolean;
  }) {
    const reason = await this.prisma.orderCancelReason.findUnique({ where: { id } });
    if (!reason) throw new NotFoundException('Cancel reason not found');
    return this.prisma.orderCancelReason.update({ where: { id }, data });
  }

  async deleteCancelReason(id: number) {
    const reason = await this.prisma.orderCancelReason.findUnique({ where: { id } });
    if (!reason) throw new NotFoundException('Cancel reason not found');
    return this.prisma.orderCancelReason.delete({ where: { id } });
  }
}
