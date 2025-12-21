import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { DriverStatus, Gender, DocumentStatus } from 'database';

// Multer file type for uploaded files
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// In-memory OTP storage for development (use Redis in production)
const otpStore = new Map<string, { code: string; expiresAt: Date; driverId?: number }>();

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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
    const existing = await this.prisma.driver.findFirst({
      where: { mobileNumber },
    });

    if (existing && existing.status !== DriverStatus.waiting_documents) {
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
      // Include OTP in dev mode for testing
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
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

    // OTP is valid, clean up
    otpStore.delete(data.mobileNumber);

    // Check for existing driver
    let driver = await this.prisma.driver.findFirst({
      where: { mobileNumber: data.mobileNumber },
    });

    if (driver) {
      // Update existing driver
      driver = await this.prisma.driver.update({
        where: { id: driver.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          status: DriverStatus.waiting_documents,
        },
      });
    } else {
      // Create new driver
      driver = await this.prisma.driver.create({
        data: {
          mobileNumber: data.mobileNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          status: DriverStatus.waiting_documents,
        },
      });
    }

    return this.generateToken(driver);
  }

  // Login with phone - sends OTP
  async loginWithPhone(mobileNumber: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { mobileNumber },
    });

    if (!driver) {
      throw new NotFoundException('Phone number not registered');
    }

    // Check if driver is blocked
    if (driver.status === DriverStatus.blocked || driver.status === DriverStatus.hard_reject) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Generate and store OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    otpStore.set(mobileNumber, { code: otp, expiresAt, driverId: driver.id });

    // Send OTP via SMS
    await this.sendOtp(mobileNumber, otp);

    return {
      message: 'OTP sent successfully',
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  // Verify OTP for login
  async verifyOtpLogin(mobileNumber: string, otp: string) {
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

    // OTP is valid
    otpStore.delete(mobileNumber);

    const driver = await this.prisma.driver.findFirst({
      where: { mobileNumber },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Update last activity
    await this.prisma.driver.update({
      where: { id: driver.id },
      data: { lastSeenAt: new Date() },
    });

    return this.generateToken(driver);
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
      driverId: existing?.driverId,
    });

    await this.sendOtp(mobileNumber, otp);

    return {
      message: 'OTP resent successfully',
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  // Legacy email/password login
  async login(email: string, password: string) {
    const driver = await this.prisma.driver.findUnique({ where: { email } });

    if (!driver) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, driver.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check driver status (not blocked or hard_reject)
    if (driver.status === DriverStatus.blocked || driver.status === DriverStatus.hard_reject) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Update last activity
    await this.prisma.driver.update({
      where: { id: driver.id },
      data: { lastSeenAt: new Date() },
    });

    return this.generateToken(driver);
  }

  // Email-based registration (without documents - simple signup)
  async registerWithEmail(data: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    password: string;
  }) {
    // Check if email already exists
    const existingEmail = await this.prisma.driver.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone already exists
    const existingPhone = await this.prisma.driver.findFirst({
      where: { mobileNumber: data.mobileNumber },
    });
    if (existingPhone) {
      throw new ConflictException('Mobile number already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create driver with waiting_documents status (needs to complete profile/upload docs)
    const driver = await this.prisma.driver.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        mobileNumber: data.mobileNumber,
        status: DriverStatus.waiting_documents,
      },
    });

    return this.generateToken(driver);
  }

  private generateToken(driver: any) {
    const payload = { sub: driver.id, email: driver.email, type: 'driver' };
    const expiresIn = 30 * 24 * 60 * 60; // 30 days in seconds

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '60d' }), // Refresh token valid for 60 days
      expiresIn,
      driver: {
        id: driver.id,
        email: driver.email,
        firstName: driver.firstName,
        lastName: driver.lastName,
        mobileNumber: driver.mobileNumber,
        status: driver.status,
        rating: driver.rating,
        reviewCount: driver.reviewCount,
      },
    };
  }

  async validateDriver(id: number) {
    return this.prisma.driver.findUnique({ where: { id } });
  }

  // Refresh token
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const driver = await this.prisma.driver.findUnique({
        where: { id: payload.sub },
      });

      if (!driver) {
        throw new UnauthorizedException('Driver not found');
      }

      return this.generateToken(driver);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Get profile
  async getProfile(driverId: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        media: true,
        carModel: true,
        carColor: true,
        fleet: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return {
      id: driver.id,
      email: driver.email,
      firstName: driver.firstName,
      lastName: driver.lastName,
      mobileNumber: driver.mobileNumber,
      countryIso: driver.countryIso,
      gender: driver.gender,
      status: driver.status,
      certificateNumber: driver.certificateNumber,
      address: driver.address,
      mediaId: driver.mediaId,
      presetAvatarNumber: driver.presetAvatarNumber,
      media: driver.media,
      carPlate: driver.carPlate,
      carModelId: driver.carModelId,
      carModel: driver.carModel,
      carColorId: driver.carColorId,
      carColor: driver.carColor,
      carProductionYear: driver.carProductionYear,
      rating: driver.rating,
      reviewCount: driver.reviewCount,
      fleetId: driver.fleetId,
      fleet: driver.fleet,
      walletBalance: driver.walletBalance,
      latitude: driver.latitude,
      longitude: driver.longitude,
      createdAt: driver.createdAt,
    };
  }

  // Update profile
  async updateProfile(
    driverId: number,
    data: {
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
    // Check email uniqueness if changing
    if (data.email) {
      const existing = await this.prisma.driver.findFirst({
        where: {
          email: data.email,
          NOT: { id: driverId },
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
    if (data.address !== undefined) updateData.address = data.address;
    if (data.certificateNumber !== undefined) updateData.certificateNumber = data.certificateNumber;
    if (data.carPlate !== undefined) updateData.carPlate = data.carPlate;
    if (data.carModelId !== undefined) updateData.carModelId = data.carModelId;
    if (data.carColorId !== undefined) updateData.carColorId = data.carColorId;
    if (data.carProductionYear !== undefined) updateData.carProductionYear = data.carProductionYear;
    if (data.presetAvatarNumber !== undefined) updateData.presetAvatarNumber = data.presetAvatarNumber;
    if (data.gender !== undefined) {
      if (data.gender === 'male') updateData.gender = Gender.male;
      else if (data.gender === 'female') updateData.gender = Gender.female;
      else updateData.gender = Gender.other;
    }

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: updateData,
      include: {
        media: true,
        carModel: true,
        carColor: true,
      },
    });

    return {
      id: driver.id,
      email: driver.email,
      firstName: driver.firstName,
      lastName: driver.lastName,
      mobileNumber: driver.mobileNumber,
      gender: driver.gender,
      countryIso: driver.countryIso,
      address: driver.address,
      certificateNumber: driver.certificateNumber,
      carPlate: driver.carPlate,
      carModelId: driver.carModelId,
      carModel: driver.carModel,
      carColorId: driver.carColorId,
      carColor: driver.carColor,
      carProductionYear: driver.carProductionYear,
      mediaId: driver.mediaId,
      presetAvatarNumber: driver.presetAvatarNumber,
      media: driver.media,
      status: driver.status,
    };
  }

  // Update avatar
  async updateAvatar(driverId: number, mediaId: number) {
    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: { mediaId },
      include: { media: true },
    });

    return {
      id: driver.id,
      mediaId: driver.mediaId,
      media: driver.media,
    };
  }

  // Update status (online/offline)
  async updateStatus(driverId: number, status: DriverStatus) {
    // Only allow online/offline status changes
    if (status !== DriverStatus.online && status !== DriverStatus.offline) {
      throw new BadRequestException('Invalid status. Can only set online or offline.');
    }

    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Check if driver can go online (must be approved)
    if (status === DriverStatus.online) {
      const blockedStatuses: DriverStatus[] = [
        DriverStatus.waiting_documents,
        DriverStatus.pending_approval,
        DriverStatus.soft_reject,
        DriverStatus.hard_reject,
        DriverStatus.blocked,
      ];
      if (blockedStatuses.includes(driver.status)) {
        throw new BadRequestException('Your account is not approved yet. Please wait for approval.');
      }
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: { status, lastSeenAt: new Date() },
    });
  }

  // Update location
  async updateLocation(driverId: number, lat: number, lng: number) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { latitude: lat, longitude: lng, lastSeenAt: new Date() },
    });
  }

  // Update notification token (for push notifications)
  async updateNotificationToken(driverId: number, token: string) {
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { notificationToken: token },
    });

    return { message: 'Notification token updated' };
  }

  // Submit driver application with documents
  async submitDriverApplication(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      mobileNumber: string;
    },
    files: MulterFile[],
    documentTypeIds?: number[],
  ) {
    // Check if email already exists
    const existingEmail = await this.prisma.driver.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone already exists
    const existingPhone = await this.prisma.driver.findFirst({
      where: { mobileNumber: data.mobileNumber },
    });
    if (existingPhone) {
      throw new ConflictException('Mobile number already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create driver with pending_approval status
    const driver = await this.prisma.driver.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        mobileNumber: data.mobileNumber,
        status: DriverStatus.pending_approval,
      },
    });

    // Save documents if files were uploaded
    if (files && files.length > 0) {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const documentTypeId = documentTypeIds?.[i];

        if (!documentTypeId) {
          console.log(`[Driver Application] Skipping file ${i} - no document type ID provided`);
          continue;
        }

        // Verify document type exists
        const documentType = await this.prisma.documentType.findUnique({
          where: { id: documentTypeId },
        });

        if (!documentType) {
          console.log(`[Driver Application] Skipping file ${i} - document type ID ${documentTypeId} not found`);
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '.jpg';
        const fileName = `driver_${driver.id}_doctype${documentTypeId}_${timestamp}${ext}`;
        const filePath = path.join(uploadsDir, fileName);

        // Save file to disk
        fs.writeFileSync(filePath, file.buffer);

        // Create Media record with full URL for cross-service access
        const baseUrl = process.env.DRIVER_API_URL || 'http://localhost:3002';
        const media = await this.prisma.media.create({
          data: {
            fileName: fileName,
            address: `${baseUrl}/uploads/documents/${fileName}`,
            mimeType: file.mimetype,
            size: file.size,
          },
        });

        // Create DriverDocument record
        await this.prisma.driverDocument.create({
          data: {
            driverId: driver.id,
            documentTypeId: documentType.id,
            mediaId: media.id,
            status: DocumentStatus.pending,
          },
        });
      }

      console.log(`[Driver Application] Driver ${driver.id} submitted with ${files.length} documents saved`);
    }

    return {
      message: 'Application submitted successfully. We will review your documents and notify you once approved.',
      applicationId: driver.id,
    };
  }
}
