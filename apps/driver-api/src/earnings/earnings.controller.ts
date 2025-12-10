import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EarningsService } from './earnings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class EarningsController {
  constructor(private earningsService: EarningsService) {}

  // ========== Earnings ==========

  // Get today's earnings
  @Get('earnings/today')
  getTodayEarnings(@Request() req) {
    return this.earningsService.getTodayEarnings(req.user.id);
  }

  // Get this week's earnings
  @Get('earnings/week')
  getWeekEarnings(@Request() req) {
    return this.earningsService.getWeekEarnings(req.user.id);
  }

  // Get earnings history
  @Get('earnings/history')
  getEarningsHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.earningsService.getEarningsHistory(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ========== Wallet ==========

  // Get wallet balance
  @Get('wallet')
  getWalletBalance(@Request() req) {
    return this.earningsService.getWalletBalance(req.user.id);
  }

  // Get wallet transactions
  @Get('wallet/transactions')
  getWalletTransactions(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.earningsService.getWalletTransactions(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // Request withdrawal
  @Post('wallet/withdraw')
  requestWithdrawal(@Request() req, @Body() body: { amount: number; bankInfo?: string }) {
    return this.earningsService.requestWithdrawal(req.user.id, body.amount, body.bankInfo);
  }

  // Get payout history
  @Get('wallet/payouts')
  getPayoutHistory(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.earningsService.getPayoutHistory(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
