import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({ path: 'services', version: '1' })
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  // === Services ===
  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.servicesService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    name: string;
    description?: string;
    categoryId?: number;
    baseFare: number;
    perHundredMeters: number;
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
    isActive?: boolean;
  }) {
    return this.servicesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name?: string;
      description?: string;
      categoryId?: number;
      baseFare?: number;
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
      isActive?: boolean;
    },
  ) {
    return this.servicesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.remove(id);
  }

  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.servicesService.toggleActive(id, isActive);
  }

  // === Service Options ===
  @Get(':id/options')
  getOptions(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.getOptions(id);
  }

  @Post(':id/options')
  addOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name: string;
      description?: string;
      icon?: string;
      price: number;
      isActive?: boolean;
    },
  ) {
    return this.servicesService.addOption(id, body);
  }

  @Patch('options/:optionId')
  updateOption(
    @Param('optionId', ParseIntPipe) optionId: number,
    @Body() body: {
      name?: string;
      description?: string;
      icon?: string;
      price?: number;
      isActive?: boolean;
    },
  ) {
    return this.servicesService.updateOption(optionId, body);
  }

  @Delete('options/:optionId')
  removeOption(@Param('optionId', ParseIntPipe) optionId: number) {
    return this.servicesService.removeOption(optionId);
  }

  // === Zone Prices ===
  @Get(':id/zone-prices')
  getZonePrices(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.getZonePrices(id);
  }

  @Post(':id/zone-prices')
  addZonePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name: string;
      fromPolygon: string;
      toPolygon: string;
      price: number;
      isActive?: boolean;
    },
  ) {
    return this.servicesService.addZonePrice(id, body);
  }

  @Patch('zone-prices/:zonePriceId')
  updateZonePrice(
    @Param('zonePriceId', ParseIntPipe) zonePriceId: number,
    @Body() body: {
      name?: string;
      fromPolygon?: string;
      toPolygon?: string;
      price?: number;
      isActive?: boolean;
    },
  ) {
    return this.servicesService.updateZonePrice(zonePriceId, body);
  }

  @Delete('zone-prices/:zonePriceId')
  removeZonePrice(@Param('zonePriceId', ParseIntPipe) zonePriceId: number) {
    return this.servicesService.removeZonePrice(zonePriceId);
  }

  // === Categories ===
  @Get('categories/all')
  getCategories() {
    return this.servicesService.getCategories();
  }

  @Post('categories')
  createCategory(@Body() body: {
    name: string;
    description?: string;
    iconUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.servicesService.createCategory(body);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() body: {
      name?: string;
      description?: string;
      iconUrl?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.servicesService.updateCategory(categoryId, body);
  }

  @Delete('categories/:categoryId')
  removeCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.servicesService.removeCategory(categoryId);
  }

  // === Regions ===
  @Get('regions/all')
  getRegions() {
    return this.servicesService.getRegions();
  }

  @Post('regions')
  createRegion(@Body() body: {
    name: string;
    currency?: string;
    polygon: string;
    isEnabled?: boolean;
  }) {
    return this.servicesService.createRegion(body);
  }

  @Patch('regions/:regionId')
  updateRegion(
    @Param('regionId', ParseIntPipe) regionId: number,
    @Body() body: {
      name?: string;
      currency?: string;
      polygon?: string;
      isEnabled?: boolean;
    },
  ) {
    return this.servicesService.updateRegion(regionId, body);
  }

  @Delete('regions/:regionId')
  removeRegion(@Param('regionId', ParseIntPipe) regionId: number) {
    return this.servicesService.removeRegion(regionId);
  }

  // === Service-Region Mapping ===
  @Post(':id/regions/:regionId')
  addServiceToRegion(
    @Param('id', ParseIntPipe) serviceId: number,
    @Param('regionId', ParseIntPipe) regionId: number,
  ) {
    return this.servicesService.addServiceToRegion(serviceId, regionId);
  }

  @Delete(':id/regions/:regionId')
  removeServiceFromRegion(
    @Param('id', ParseIntPipe) serviceId: number,
    @Param('regionId', ParseIntPipe) regionId: number,
  ) {
    return this.servicesService.removeServiceFromRegion(serviceId, regionId);
  }
}
