import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('charts')
  getCharts(@Query('period') period: 'week' | 'month' = 'week') {
    return this.dashboardService.getCharts(period);
  }

  @Get('live')
  getLiveData() {
    return this.dashboardService.getLiveData();
  }

  @Get('activity')
  getRecentActivity(@Query('limit') limit = '20') {
    return this.dashboardService.getRecentActivity(+limit);
  }

  @Get('recent-orders')
  getRecentOrders(@Query('limit') limit = '10') {
    return this.dashboardService.getRecentOrders(+limit);
  }

  @Get('orders-by-status')
  getOrdersByStatus() {
    return this.dashboardService.getOrdersByStatus();
  }

  @Get('revenue-by-date')
  getRevenueByDate(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.getRevenueByDate(startDate, endDate);
  }
}
