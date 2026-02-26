import { Injectable, BadRequestException } from '@nestjs/common';
import { AuthService } from '../../v1/auth/auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthV2Service {
  constructor(
    private authV1: AuthService,
    private prisma: PrismaService,
  ) {}

  async deleteAccount(driverId: number) {
    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: 'blocked',
        deletedAt: new Date(),
      },
    });

    return { message: 'Account deleted successfully' };
  }

  async sendEmailOtp(driverId: number) {
    // TODO: Implement email OTP sending
    throw new BadRequestException('Email OTP not yet implemented');
  }

  async verifyEmailOtp(driverId: number, otp: string) {
    // TODO: Implement email OTP verification
    throw new BadRequestException('Email OTP not yet implemented');
  }
}
