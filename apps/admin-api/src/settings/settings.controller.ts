import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentGatewayType, AnnouncementUserType, DevicePlatform } from 'database';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  // === General Settings ===
  @Get()
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get('key/:key')
  getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Post()
  upsertSetting(@Body() body: { key: string; value: string; description?: string }) {
    return this.settingsService.upsertSetting(body.key, body.value, body.description);
  }

  @Delete('key/:key')
  deleteSetting(@Param('key') key: string) {
    return this.settingsService.deleteSetting(key);
  }

  // === Car Models ===
  @Get('car-models')
  getCarModels(@Query('includeInactive') includeInactive?: string) {
    return this.settingsService.getCarModels(includeInactive === 'true');
  }

  @Post('car-models')
  createCarModel(@Body() body: { brand: string; model: string; year?: number; isActive?: boolean }) {
    return this.settingsService.createCarModel(body);
  }

  @Patch('car-models/:id')
  updateCarModel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { brand?: string; model?: string; year?: number; isActive?: boolean },
  ) {
    return this.settingsService.updateCarModel(id, body);
  }

  @Delete('car-models/:id')
  deleteCarModel(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteCarModel(id);
  }

  // === Car Colors ===
  @Get('car-colors')
  getCarColors(@Query('includeInactive') includeInactive?: string) {
    return this.settingsService.getCarColors(includeInactive === 'true');
  }

  @Post('car-colors')
  createCarColor(@Body() body: { name: string; hexCode?: string; isActive?: boolean }) {
    return this.settingsService.createCarColor(body);
  }

  @Patch('car-colors/:id')
  updateCarColor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; hexCode?: string; isActive?: boolean },
  ) {
    return this.settingsService.updateCarColor(id, body);
  }

  @Delete('car-colors/:id')
  deleteCarColor(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteCarColor(id);
  }

  // === Document Types ===
  @Get('document-types')
  getDocumentTypes(@Query('includeInactive') includeInactive?: string) {
    return this.settingsService.getDocumentTypes(includeInactive === 'true');
  }

  @Post('document-types')
  createDocumentType(@Body() body: {
    name: string;
    description?: string;
    isRequired?: boolean;
    hasExpiry?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.settingsService.createDocumentType(body);
  }

  @Patch('document-types/:id')
  updateDocumentType(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name?: string;
      description?: string;
      isRequired?: boolean;
      hasExpiry?: boolean;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.settingsService.updateDocumentType(id, body);
  }

  @Delete('document-types/:id')
  deleteDocumentType(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteDocumentType(id);
  }

  // === Payment Gateways ===
  @Get('payment-gateways')
  getPaymentGateways() {
    return this.settingsService.getPaymentGateways();
  }

  @Get('payment-gateways/:id')
  getPaymentGateway(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.getPaymentGateway(id);
  }

  @Post('payment-gateways')
  createPaymentGateway(@Body() body: {
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
    return this.settingsService.createPaymentGateway(body);
  }

  @Patch('payment-gateways/:id')
  updatePaymentGateway(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      type?: PaymentGatewayType;
      title?: string;
      description?: string;
      publicKey?: string;
      privateKey?: string;
      merchantId?: string;
      saltKey?: string;
      mediaId?: number;
      isEnabled?: boolean;
    },
  ) {
    return this.settingsService.updatePaymentGateway(id, body);
  }

  @Delete('payment-gateways/:id')
  deletePaymentGateway(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deletePaymentGateway(id);
  }

  // === Coupons ===
  @Get('coupons')
  getCoupons(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.settingsService.getCoupons(+page, +limit);
  }

  @Get('coupons/:id')
  getCoupon(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.getCoupon(id);
  }

  @Post('coupons')
  createCoupon(@Body() body: {
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
    return this.settingsService.createCoupon(body);
  }

  @Patch('coupons/:id')
  updateCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
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
    },
  ) {
    return this.settingsService.updateCoupon(id, body);
  }

  @Delete('coupons/:id')
  deleteCoupon(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteCoupon(id);
  }

  // === Announcements ===
  @Get('announcements')
  getAnnouncements(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.settingsService.getAnnouncements(+page, +limit);
  }

  @Get('announcements/:id')
  getAnnouncement(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.getAnnouncement(id);
  }

  @Post('announcements')
  createAnnouncement(@Body() body: {
    title: string;
    description: string;
    url?: string;
    userType?: AnnouncementUserType;
    mediaId?: number;
    startAt: Date;
    expireAt?: Date;
    isActive?: boolean;
  }) {
    return this.settingsService.createAnnouncement(body);
  }

  @Patch('announcements/:id')
  updateAnnouncement(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      title?: string;
      description?: string;
      url?: string;
      userType?: AnnouncementUserType;
      mediaId?: number;
      startAt?: Date;
      expireAt?: Date;
      isActive?: boolean;
    },
  ) {
    return this.settingsService.updateAnnouncement(id, body);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteAnnouncement(id);
  }

  // === App Versions ===
  @Get('app-versions')
  getAppVersions() {
    return this.settingsService.getAppVersions();
  }

  @Get('app-versions/:id')
  getAppVersion(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.getAppVersion(id);
  }

  @Post('app-versions')
  createAppVersion(@Body() body: {
    platform: DevicePlatform;
    appType: string;
    versionCode: number;
    versionName: string;
    releaseNotes?: string;
    forceUpdate?: boolean;
    storeUrl?: string;
  }) {
    return this.settingsService.createAppVersion(body);
  }

  @Patch('app-versions/:id')
  updateAppVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      versionCode?: number;
      versionName?: string;
      releaseNotes?: string;
      forceUpdate?: boolean;
      storeUrl?: string;
    },
  ) {
    return this.settingsService.updateAppVersion(id, body);
  }

  @Delete('app-versions/:id')
  deleteAppVersion(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteAppVersion(id);
  }

  // === Cancel Reasons ===
  @Get('cancel-reasons')
  getCancelReasons(@Query('includeInactive') includeInactive?: string) {
    return this.settingsService.getCancelReasons(includeInactive === 'true');
  }

  @Post('cancel-reasons')
  createCancelReason(@Body() body: {
    title: string;
    isForDriver?: boolean;
    isForRider?: boolean;
    isActive?: boolean;
  }) {
    return this.settingsService.createCancelReason(body);
  }

  @Patch('cancel-reasons/:id')
  updateCancelReason(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      title?: string;
      isForDriver?: boolean;
      isForRider?: boolean;
      isActive?: boolean;
    },
  ) {
    return this.settingsService.updateCancelReason(id, body);
  }

  @Delete('cancel-reasons/:id')
  deleteCancelReason(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteCancelReason(id);
  }
}
