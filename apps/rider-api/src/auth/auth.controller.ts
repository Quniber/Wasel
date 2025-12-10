import { Controller, Post, Get, Patch, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ========== Phone-based OTP Auth ==========

  // Step 1: Request OTP for registration
  @Post('register')
  registerWithPhone(@Body() body: { mobileNumber: string }) {
    return this.authService.registerWithPhone(body.mobileNumber);
  }

  // Step 2: Verify OTP and complete registration
  @Post('verify-otp')
  verifyOtpAndRegister(
    @Body()
    body: {
      mobileNumber: string;
      otp: string;
      firstName: string;
      lastName: string;
      email?: string;
    },
  ) {
    return this.authService.verifyOtpAndRegister(body);
  }

  // Request OTP for login
  @Post('login')
  loginWithPhone(@Body() body: { mobileNumber: string }) {
    return this.authService.loginWithPhone(body.mobileNumber);
  }

  // Verify OTP for login
  @Post('login/verify-otp')
  verifyOtpLogin(@Body() body: { mobileNumber: string; otp: string }) {
    return this.authService.verifyOtpLogin(body.mobileNumber, body.otp);
  }

  // Resend OTP
  @Post('resend-otp')
  resendOtp(@Body() body: { mobileNumber: string }) {
    return this.authService.resendOtp(body.mobileNumber);
  }

  // ========== Legacy Email/Password Auth ==========

  @Post('register/email')
  registerWithEmail(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      mobileNumber: string;
      password: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Post('login/email')
  loginWithEmail(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // ========== Profile Endpoints ==========

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Req() req: any,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      gender?: string;
      countryIso?: string;
      isResident?: boolean;
      idNumber?: string;
      presetAvatarNumber?: number;
    },
  ) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/avatar')
  updateAvatar(@Req() req: any, @Body() body: { mediaId: number }) {
    return this.authService.updateAvatar(req.user.id, body.mediaId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  deleteAccount(@Req() req: any) {
    return this.authService.deleteAccount(req.user.id);
  }

  // ========== Push Notifications ==========

  @UseGuards(JwtAuthGuard)
  @Post('notification-token')
  updateNotificationToken(@Req() req: any, @Body() body: { token: string }) {
    return this.authService.updateNotificationToken(req.user.id, body.token);
  }
}
