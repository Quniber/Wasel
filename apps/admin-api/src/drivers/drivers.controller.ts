import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe, Req, BadRequestException, ConflictException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriverStatus, TransactionType } from 'database';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('status') status?: DriverStatus,
    @Query('fleetId') fleetId?: string,
  ) {
    return this.driversService.findAll(
      +page,
      +limit,
      search,
      status,
      fleetId ? +fleetId : undefined,
    );
  }

  // Get drivers with locations for live map - MUST be before :id routes
  @Get('locations')
  findAllWithLocations(
    @Query('status') status?: DriverStatus,
  ) {
    return this.driversService.findAllWithLocations(status);
  }

  // Create driver with documents - MUST be before :id routes
  @Post('register')
  async createWithDocuments(
    @Body() body: {
      firstName: string;
      lastName: string;
      email?: string;
      mobileNumber: string;
      password?: string;
      carPlate?: string;
      carModelId?: number;
      carColorId?: number;
      fleetId?: number;
      documents?: Array<{
        documentTypeId: number;
        fileUrl: string;
        fileName: string;
        mimeType?: string;
        expiryDate?: string;
      }>;
    },
  ) {
    try {
      const { documents, ...driverData } = body;
      const parsedDocuments = documents?.map(doc => ({
        ...doc,
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
      }));
      return await this.driversService.createWithDocuments(driverData, parsedDocuments);
    } catch (error: any) {
      console.error('Driver registration error:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
        name: error.name,
      });
      // Check for Prisma-specific errors
      if (error.code === 'P2002') {
        // Unique constraint violation
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`A driver with this ${field} already exists`);
      }
      if (error.code === 'P2003') {
        // Foreign key constraint violation
        const field = error.meta?.field_name || 'reference';
        throw new BadRequestException(`Invalid reference for ${field}: The selected option does not exist`);
      }
      if (error.code === 'P2025') {
        // Record not found
        throw new BadRequestException('Referenced record not found');
      }
      throw new BadRequestException(error.message || 'Failed to register driver');
    }
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.findOne(id);
  }

  @Post()
  create(@Body() body: {
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
    return this.driversService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
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
    },
  ) {
    return this.driversService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.remove(id);
  }

  // Documents
  @Get(':id/documents')
  getDocuments(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getDocuments(id);
  }

  @Patch('documents/:documentId/verify')
  verifyDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Req() req: any,
  ) {
    return this.driversService.verifyDocument(documentId, req.user.id);
  }

  @Patch('documents/:documentId/reject')
  rejectDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body('rejectionNote') rejectionNote: string,
    @Req() req: any,
  ) {
    return this.driversService.rejectDocument(documentId, req.user.id, rejectionNote);
  }

  // Wallet
  @Get(':id/wallet')
  getWallet(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getWallet(id);
  }

  @Post(':id/wallet/adjust')
  adjustWallet(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      amount: number;
      type: TransactionType;
      description: string;
    },
  ) {
    return this.driversService.adjustWallet(id, body.amount, body.type, body.description);
  }

  // Orders
  @Get(':id/orders')
  getOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.driversService.getOrders(id, +page, +limit);
  }

  // Stats
  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getStats(id);
  }

  // Services
  @Get(':id/services')
  getServices(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getServices(id);
  }

  @Patch(':id/services/:serviceId')
  toggleService(
    @Param('id', ParseIntPipe) id: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body('isEnabled') isEnabled: boolean,
  ) {
    return this.driversService.toggleService(id, serviceId, isEnabled);
  }

  // Notes
  @Get(':id/notes')
  getNotes(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getNotes(id);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    return this.driversService.addNote(id, req.user.id, note);
  }

  // Upload Document
  @Post(':id/documents')
  uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      documentTypeId: number;
      fileUrl: string;
      fileName: string;
      mimeType?: string;
      expiryDate?: string;
    },
  ) {
    return this.driversService.uploadDocument(
      id,
      body.documentTypeId,
      body.fileUrl,
      body.fileName,
      body.mimeType,
      body.expiryDate ? new Date(body.expiryDate) : undefined,
    );
  }
}
