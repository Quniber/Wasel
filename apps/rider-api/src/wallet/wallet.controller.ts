import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  // Get wallet balance
  @Get()
  getBalance(@Req() req: any) {
    return this.walletService.getBalance(req.user.id);
  }

  // Get transaction history
  @Get('transactions')
  getTransactions(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.walletService.getTransactions(
      req.user.id,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  // Get top-up options
  @Get('topup-options')
  getTopUpOptions() {
    return this.walletService.getTopUpOptions();
  }

  // Top up wallet
  @Post('topup')
  topUp(
    @Req() req: any,
    @Body() body: { amount: number; paymentMethodId?: number },
  ) {
    return this.walletService.topUp(req.user.id, body.amount, body.paymentMethodId);
  }
}
