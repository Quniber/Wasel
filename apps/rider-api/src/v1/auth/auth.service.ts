import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SessionsService, DeviceInfo } from '../sessions/sessions.service';
import { Gender } from 'database';

// In-memory OTP storage for development (use Redis in production)
const otpStore = new Map<string, { code: string; expiresAt: Date; customerId?: number }>();

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => SessionsService))
    private sessionsService: SessionsService,
  ) {}

  // Generate 6-digit OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP (fake for dev - just logs it)
  private async sendOtp(mobileNumber: string, otp: string): Promise<void> {
    // In production, integrate with Twilio or other SMS provider
    console.log(`[DEV SMS] OTP for ${mobileNumber}: ${otp}`);
  }

  // Step 1: Register with phone - sends OTP
  async registerWithPhone(mobileNumber: string) {
    // Check if phone already registered
    const existing = await this.prisma.customer.findFirst({
      where: { mobileNumber },
    });

    if (existing && existing.status === 'enabled') {
      throw new ConflictException('Phone number already registered');
    }

    // Generate and store OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    otpStore.set(mobileNumber, { code: otp, expiresAt });

    // Send OTP via SMS (fake for dev)
    await this.sendOtp(mobileNumber, otp);

    return {
      message: 'OTP sent successfully',
      // Always return devOtp during testing phase - remove before actual production
      devOtp: otp,
    };
  }

  // Step 2: Verify OTP and complete registration
  async verifyOtpAndRegister(data: {
    mobileNumber: string;
    otp: string;
    firstName: string;
    lastName: string;
    email?: string;
  }) {
    // Accept fixed OTP "123123" for testing
    if (data.otp !== '123123') {
      const stored = otpStore.get(data.mobileNumber);

      if (!stored) {
        throw new BadRequestException('OTP not found. Please request a new one.');
      }

      if (new Date() > stored.expiresAt) {
        otpStore.delete(data.mobileNumber);
        throw new BadRequestException('OTP expired. Please request a new one.');
      }

      if (stored.code !== data.otp) {
        throw new BadRequestException('Invalid OTP');
      }
    }

    // OTP is valid, clean up
    otpStore.delete(data.mobileNumber);

    // Check for existing customer
    let customer = await this.prisma.customer.findFirst({
      where: { mobileNumber: data.mobileNumber },
    });

    if (customer) {
      // Update existing customer
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          status: 'enabled',
        },
      });
    } else {
      // Create new customer
      customer = await this.prisma.customer.create({
        data: {
          mobileNumber: data.mobileNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          status: 'enabled',
        },
      });
    }

    return this.generateToken(customer);
  }

  // Step 2: Verify OTP and complete registration (with session)
  async verifyOtpAndRegisterWithSession(
    data: {
      mobileNumber: string;
      otp: string;
      firstName: string;
      lastName: string;
      email?: string;
    },
    deviceInfo: DeviceInfo,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Accept fixed OTP "123123" for testing
    if (data.otp !== '123123') {
      const stored = otpStore.get(data.mobileNumber);

      if (!stored) {
        throw new BadRequestException('OTP not found. Please request a new one.');
      }

      if (new Date() > stored.expiresAt) {
        otpStore.delete(data.mobileNumber);
        throw new BadRequestException('OTP expired. Please request a new one.');
      }

      if (stored.code !== data.otp) {
        throw new BadRequestException('Invalid OTP');
      }
    }

    // OTP is valid, clean up
    otpStore.delete(data.mobileNumber);

    // Check for existing customer
    let customer = await this.prisma.customer.findFirst({
      where: { mobileNumber: data.mobileNumber },
    });

    if (customer) {
      // Update existing customer
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          status: 'enabled',
        },
      });
    } else {
      // Create new customer
      customer = await this.prisma.customer.create({
        data: {
          mobileNumber: data.mobileNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          status: 'enabled',
        },
      });
    }

    return this.generateTokenWithSession(customer, deviceInfo, ipAddress, userAgent);
  }

  // Login with phone - sends OTP
  async loginWithPhone(mobileNumber: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { mobileNumber },
    });

    if (!customer) {
      throw new NotFoundException('Phone number not registered');
    }

    if (customer.status !== 'enabled') {
      throw new UnauthorizedException('Account is disabled');
    }

    // Generate and store OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    otpStore.set(mobileNumber, { code: otp, expiresAt, customerId: customer.id });

    // Send OTP via SMS
    await this.sendOtp(mobileNumber, otp);

    return {
      message: 'OTP sent successfully',
      // Always return devOtp during testing phase - remove before actual production
      devOtp: otp,
    };
  }

  // Verify OTP for login
  async verifyOtpLogin(mobileNumber: string, otp: string) {
    // Accept fixed OTP "123123" for testing
    if (otp !== '123123') {
      const stored = otpStore.get(mobileNumber);

      if (!stored) {
        throw new BadRequestException('OTP not found. Please request a new one.');
      }

      if (new Date() > stored.expiresAt) {
        otpStore.delete(mobileNumber);
        throw new BadRequestException('OTP expired. Please request a new one.');
      }

      if (stored.code !== otp) {
        throw new BadRequestException('Invalid OTP');
      }
    }

    // OTP is valid
    otpStore.delete(mobileNumber);

    const customer = await this.prisma.customer.findFirst({
      where: { mobileNumber },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Update last activity
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastActivityAt: new Date() },
    });

    return this.generateToken(customer);
  }

  // Verify OTP for login (with session)
  async verifyOtpLoginWithSession(
    mobileNumber: string,
    otp: string,
    deviceInfo: DeviceInfo,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Accept fixed OTP "123123" for testing
    if (otp !== '123123') {
      const stored = otpStore.get(mobileNumber);

      if (!stored) {
        throw new BadRequestException('OTP not found. Please request a new one.');
      }

      if (new Date() > stored.expiresAt) {
        otpStore.delete(mobileNumber);
        throw new BadRequestException('OTP expired. Please request a new one.');
      }

      if (stored.code !== otp) {
        throw new BadRequestException('Invalid OTP');
      }
    }

    // OTP is valid
    otpStore.delete(mobileNumber);

    const customer = await this.prisma.customer.findFirst({
      where: { mobileNumber },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Update last activity
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastActivityAt: new Date() },
    });

    return this.generateTokenWithSession(customer, deviceInfo, ipAddress, userAgent);
  }

  // Resend OTP
  async resendOtp(mobileNumber: string) {
    // Generate new OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Check if there's existing data for this number
    const existing = otpStore.get(mobileNumber);
    otpStore.set(mobileNumber, {
      code: otp,
      expiresAt,
      customerId: existing?.customerId,
    });

    await this.sendOtp(mobileNumber, otp);

    return {
      message: 'OTP resent successfully',
      // Always return devOtp during testing phase - remove before actual production
      devOtp: otp,
    };
  }

  // Legacy email/password registration
  async register(data: { firstName: string; lastName: string; email: string; mobileNumber: string; password: string }) {
    const existing = await this.prisma.customer.findFirst({
      where: { OR: [{ email: data.email }, { mobileNumber: data.mobileNumber }] },
    });

    if (existing) {
      throw new ConflictException('Email or phone already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const customer = await this.prisma.customer.create({
      data: { ...data, password: hashedPassword, status: 'enabled' },
    });

    return this.generateToken(customer);
  }

  // Email/password registration (with session)
  async registerWithSession(
    data: { firstName: string; lastName: string; email: string; mobileNumber: string; password: string },
    deviceInfo: DeviceInfo,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.customer.findFirst({
      where: { OR: [{ email: data.email }, { mobileNumber: data.mobileNumber }] },
    });

    if (existing) {
      throw new ConflictException('Email or phone already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const customer = await this.prisma.customer.create({
      data: { ...data, password: hashedPassword, status: 'enabled' },
    });

    return this.generateTokenWithSession(customer, deviceInfo, ipAddress, userAgent);
  }

  // Legacy email/password login
  async login(email: string, password: string) {
    const customer = await this.prisma.customer.findUnique({ where: { email } });

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (customer.status !== 'enabled') {
      throw new UnauthorizedException('Account is disabled');
    }

    // Update last activity
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastActivityAt: new Date() },
    });

    return this.generateToken(customer);
  }

  // Email/password login (with session)
  async loginWithSession(
    email: string,
    password: string,
    deviceInfo: DeviceInfo,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const customer = await this.prisma.customer.findUnique({ where: { email } });

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (customer.status !== 'enabled') {
      throw new UnauthorizedException('Account is disabled');
    }

    // Update last activity
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastActivityAt: new Date() },
    });

    return this.generateTokenWithSession(customer, deviceInfo, ipAddress, userAgent);
  }

  private generateToken(customer: any) {
    const payload = { sub: customer.id, email: customer.email, type: 'customer' };
    return {
      accessToken: this.jwtService.sign(payload),
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        mobileNumber: customer.mobileNumber,
        gender: customer.gender,
        mediaId: customer.mediaId,
        presetAvatarNumber: customer.presetAvatarNumber,
        walletBalance: customer.walletBalance,
      },
    };
  }

  // Generate token with session (new method that creates session)
  async generateTokenWithSession(
    customer: any,
    deviceInfo: DeviceInfo = {},
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Create session and get tokens
    const tokens = await this.sessionsService.createSession(
      customer.id,
      deviceInfo,
      ipAddress,
      userAgent,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        mobileNumber: customer.mobileNumber,
        gender: customer.gender,
        mediaId: customer.mediaId,
        presetAvatarNumber: customer.presetAvatarNumber,
        walletBalance: customer.walletBalance,
      },
    };
  }

  async validateCustomer(id: number) {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  // Get profile
  async getProfile(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        media: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      mobileNumber: customer.mobileNumber,
      gender: customer.gender,
      countryIso: customer.countryIso,
      isResident: customer.isResident,
      idNumber: customer.idNumber,
      mediaId: customer.mediaId,
      presetAvatarNumber: customer.presetAvatarNumber,
      walletBalance: customer.walletBalance,
      defaultPaymentMethodId: customer.defaultPaymentMethodId,
      media: customer.media,
      createdAt: customer.createdAt,
    };
  }

  // Update profile
  async updateProfile(
    customerId: number,
    data: {
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
    // Check email uniqueness if changing
    if (data.email) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          email: data.email,
          NOT: { id: customerId },
        },
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    // Build update data with proper enum type
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.countryIso !== undefined) updateData.countryIso = data.countryIso;
    if (data.isResident !== undefined) updateData.isResident = data.isResident;
    if (data.idNumber !== undefined) updateData.idNumber = data.idNumber;
    if (data.presetAvatarNumber !== undefined) updateData.presetAvatarNumber = data.presetAvatarNumber;
    if (data.gender !== undefined) {
      if (data.gender === 'male') updateData.gender = Gender.male;
      else if (data.gender === 'female') updateData.gender = Gender.female;
      else updateData.gender = Gender.other;
    }

    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: updateData,
      include: { media: true },
    });

    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      mobileNumber: customer.mobileNumber,
      gender: customer.gender,
      countryIso: customer.countryIso,
      isResident: customer.isResident,
      idNumber: customer.idNumber,
      mediaId: customer.mediaId,
      presetAvatarNumber: customer.presetAvatarNumber,
      walletBalance: customer.walletBalance,
      media: customer.media,
    };
  }

  // Update avatar
  async updateAvatar(customerId: number, mediaId: number) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { mediaId },
      include: { media: true },
    });

    return {
      id: customer.id,
      mediaId: customer.mediaId,
      media: customer.media,
    };
  }

  // Delete account (soft delete)
  async deleteAccount(customerId: number) {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        status: 'disabled',
        deletedAt: new Date(),
      },
    });

    return { message: 'Account deleted successfully' };
  }

  // Update notification token (for push notifications)
  async updateNotificationToken(customerId: number, token: string) {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { notificationToken: token },
    });

    return { message: 'Notification token updated' };
  }
}
