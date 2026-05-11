import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({ path: 'sms', version: '1' })
@UseGuards(JwtAuthGuard)
export class SmsController {
  constructor(private smsService: SmsService) {}

  // ============ recipient pickers ============

  @Get('recipients/drivers')
  listDrivers(@Query('q') q?: string) {
    return this.smsService.listDrivers(q);
  }

  @Get('recipients/customers')
  listCustomers(@Query('q') q?: string) {
    return this.smsService.listCustomers(q);
  }

  // ============ groups ============

  @Get('groups')
  listGroups() {
    return this.smsService.listGroups();
  }

  @Get('groups/:id')
  getGroup(@Param('id', ParseIntPipe) id: number) {
    return this.smsService.getGroup(id);
  }

  @Post('groups')
  createGroup(
    @Req() req: any,
    @Body() body: {
      name: string;
      driverIds?: number[];
      customerIds?: number[];
      manualNumbers?: string[];
    },
  ) {
    return this.smsService.createGroup(body, req.user?.id);
  }

  @Put('groups/:id')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name?: string;
      driverIds?: number[];
      customerIds?: number[];
      manualNumbers?: string[];
    },
  ) {
    return this.smsService.updateGroup(id, body);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id', ParseIntPipe) id: number) {
    return this.smsService.deleteGroup(id);
  }

  // ============ send ============

  @Post('send')
  send(
    @Req() req: any,
    @Body() body: {
      body: string;
      language?: 'en' | 'ar';
      groupId?: number;
      driverIds?: number[];
      customerIds?: number[];
      manualNumbers?: string[];
    },
  ) {
    return this.smsService.sendBulk(body, req.user?.id);
  }

  // ============ history ============

  @Get('messages')
  listMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.smsService.listMessages({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      batchId,
    });
  }

  @Get('batches')
  listBatches(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.smsService.listBatches({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
