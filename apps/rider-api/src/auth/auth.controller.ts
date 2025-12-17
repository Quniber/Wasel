import { Controller, Post, Get, Patch, Delete, Body, UseGuards, Req, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DeviceInfo } from '../sessions/sessions.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ========== Phone-based OTP Auth ==========

  // Step 1: Request OTP for registration
  @Post('register')
  registerWithPhone(@Body() body: { mobileNumber: string }) {
    return this.authService.registerWithPhone(body.mobileNumber);
  }

  // Step 2: Verify OTP and complete registration (with session)
  @Post('verify-otp')
  verifyOtpAndRegister(
    @Req() req: any,
    @Headers('user-agent') userAgent: string,
    @Body()
    body: {
      mobileNumber: string;
      otp: string;
      firstName: string;
      lastName: string;
      email?: string;
      deviceInfo?: DeviceInfo;
    },
  ) {
    return this.authService.verifyOtpAndRegisterWithSession(
      body,
      body.deviceInfo || {},
      req.ip || req.connection?.remoteAddress,
      userAgent,
    );
  }

  // Request OTP for login
  @Post('login')
  loginWithPhone(@Body() body: { mobileNumber: string }) {
    return this.authService.loginWithPhone(body.mobileNumber);
  }

  // Verify OTP for login (with session)
  @Post('login/verify-otp')
  verifyOtpLogin(
    @Req() req: any,
    @Headers('user-agent') userAgent: string,
    @Body() body: { mobileNumber: string; otp: string; deviceInfo?: DeviceInfo },
  ) {
    return this.authService.verifyOtpLoginWithSession(
      body.mobileNumber,
      body.otp,
      body.deviceInfo || {},
      req.ip || req.connection?.remoteAddress,
      userAgent,
    );
  }

  // Resend OTP
  @Post('resend-otp')
  resendOtp(@Body() body: { mobileNumber: string }) {
    return this.authService.resendOtp(body.mobileNumber);
  }

  // ========== Legacy Email/Password Auth ==========

  @Post('register/email')
  registerWithEmail(
    @Req() req: any,
    @Headers('user-agent') userAgent: string,
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      mobileNumber: string;
      password: string;
      deviceInfo?: DeviceInfo;
    },
  ) {
    return this.authService.registerWithSession(
      body,
      body.deviceInfo || {},
      req.ip || req.connection?.remoteAddress,
      userAgent,
    );
  }

  @Post('login/email')
  loginWithEmail(
    @Req() req: any,
    @Headers('user-agent') userAgent: string,
    @Body() body: { email: string; password: string; deviceInfo?: DeviceInfo },
  ) {
    return this.authService.loginWithSession(
      body.email,
      body.password,
      body.deviceInfo || {},
      req.ip || req.connection?.remoteAddress,
      userAgent,
    );
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
