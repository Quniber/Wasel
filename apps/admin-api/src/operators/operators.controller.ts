import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { OperatorsService } from './operators.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperatorRole } from 'database';

@Controller('operators')
@UseGuards(JwtAuthGuard)
export class OperatorsController {
  constructor(private operatorsService: OperatorsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: OperatorRole,
  ) {
    return this.operatorsService.findAll(+page, +limit, role);
  }

  @Get('stats')
  getStats() {
    return this.operatorsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.operatorsService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: OperatorRole;
    isActive?: boolean;
  }) {
    return this.operatorsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: OperatorRole;
      isActive?: boolean;
      notificationToken?: string;
    },
  ) {
    return this.operatorsService.update(id, body);
  }

  @Patch(':id/password')
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string,
  ) {
    return this.operatorsService.updatePassword(id, password);
  }

  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
    @Request() req: any,
  ) {
    return this.operatorsService.toggleActive(id, isActive, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.operatorsService.remove(id, req.user.sub);
  }

  @Get(':id/activity')
  getActivity(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.operatorsService.getActivity(id, +page, +limit);
  }
}
