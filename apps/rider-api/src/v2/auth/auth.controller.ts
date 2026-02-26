import { Controller, Delete, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthV2Service } from './auth.service';

@Controller({ path: 'auth', version: '2' })
export class AuthV2Controller {
  constructor(private authV2Service: AuthV2Service) {}

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  deleteAccount(@Req() req: any) {
    return this.authV2Service.deleteAccount(req.user.id);
  }

  @Post('email/send-otp')
  @UseGuards(JwtAuthGuard)
  sendEmailOtp(@Req() req: any) {
    return this.authV2Service.sendEmailOtp(req.user.id);
  }

  @Post('email/verify-otp')
  @UseGuards(JwtAuthGuard)
  verifyEmailOtp(@Req() req: any, @Body() body: { otp: string }) {
    return this.authV2Service.verifyEmailOtp(req.user.id, body.otp);
  }
}
