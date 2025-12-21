import { Controller, Post, Get, Patch, Body, UseGuards, Req, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DriverStatus } from 'database';

// Multer file type for uploaded files
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ========== Driver Application ==========

  // Submit driver application with documents
  @Post('apply')
  @UseInterceptors(FilesInterceptor('documents', 10, { storage: require('multer').memoryStorage() }))
  async submitApplication(
    @Body() body: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      mobileNumber: string;
      'documentTypeIds[0]'?: string;
      'documentTypeIds[1]'?: string;
      'documentTypeIds[2]'?: string;
      'documentTypeIds[3]'?: string;
      'documentTypeIds[4]'?: string;
      'documentTypeIds[5]'?: string;
      'documentTypeIds[6]'?: string;
      'documentTypeIds[7]'?: string;
      'documentTypeIds[8]'?: string;
      'documentTypeIds[9]'?: string;
    },
    @UploadedFiles() files: MulterFile[],
  ) {
    // Debug logging
    console.log('[Driver Application] Received body:', JSON.stringify(body, null, 2));
    console.log('[Driver Application] Received files:', files?.length || 0);

    // Extract document type IDs from body - handle both array and indexed formats
    let documentTypeIds: number[] = [];

    // Check if documentTypeIds is sent as an array
    const bodyAny = body as any;
    if (bodyAny.documentTypeIds && Array.isArray(bodyAny.documentTypeIds)) {
      documentTypeIds = bodyAny.documentTypeIds.map((id: string) => parseInt(id, 10));
    } else {
      // Fall back to indexed format: documentTypeIds[0], documentTypeIds[1], etc.
      for (let i = 0; i < 10; i++) {
        const key = `documentTypeIds[${i}]` as keyof typeof body;
        if (body[key]) {
          documentTypeIds.push(parseInt(body[key] as string, 10));
        }
      }
    }

    console.log('[Driver Application] Parsed documentTypeIds:', documentTypeIds);
    return this.authService.submitDriverApplication(body, files || [], documentTypeIds);
  }

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

  @Post('login/email')
  loginWithEmail(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // Email-based registration (simple signup without documents)
  @Post('register/email')
  registerWithEmail(
    @Body() body: {
      firstName: string;
      lastName: string;
      email: string;
      mobileNumber: string;
      password: string;
    },
  ) {
    return this.authService.registerWithEmail(body);
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
      address?: string;
      certificateNumber?: string;
      carPlate?: string;
      carModelId?: number;
      carColorId?: number;
      carProductionYear?: number;
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

  // ========== Status & Location ==========

  @Patch('status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Req() req: any, @Body() body: { status: DriverStatus }) {
    return this.authService.updateStatus(req.user.id, body.status);
  }

  @Patch('location')
  @UseGuards(JwtAuthGuard)
  updateLocation(@Req() req: any, @Body() body: { latitude: number; longitude: number }) {
    return this.authService.updateLocation(req.user.id, body.latitude, body.longitude);
  }

  // ========== Push Notifications ==========

  @UseGuards(JwtAuthGuard)
  @Post('notification-token')
  updateNotificationToken(@Req() req: any, @Body() body: { token: string }) {
    return this.authService.updateNotificationToken(req.user.id, body.token);
  }
}
