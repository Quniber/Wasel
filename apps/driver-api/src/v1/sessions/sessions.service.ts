import { Injectable, UnauthorizedException, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomBytes } from 'crypto';
import { DevicePlatform, DriverStatus } from 'database';

export interface DeviceInfo {
  deviceId?: string;
  devicePlatform?: 'ios' | 'android' | 'web';
  deviceModel?: string;
  appVersion?: string;
  deviceToken?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class SessionsService implements OnModuleInit {
  private readonly logger = new Logger(SessionsService.name);
  private readonly accessTokenExpiry: string = '15m';
  private readonly refreshTokenExpiry: number = 30; // days

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  onModuleInit() {
    // Run cleanup daily (every 24 hours)
    setInterval(() => this.cleanupExpiredSessions(), 24 * 60 * 60 * 1000);
    // Run once on startup after a short delay
    setTimeout(() => this.cleanupExpiredSessions(), 10000);
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  async createSession(
    driverId: number,
    deviceInfo: DeviceInfo,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SessionTokens> {
    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiry);

    const payload = { sub: driverId, type: 'driver' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiry });

    let platform: DevicePlatform | null = null;
    if (deviceInfo.devicePlatform === 'ios') platform = DevicePlatform.ios;
    else if (deviceInfo.devicePlatform === 'android') platform = DevicePlatform.android;
    else if (deviceInfo.devicePlatform === 'web') platform = DevicePlatform.web;

    await this.prisma.driverSession.create({
      data: {
        driverId,
        refreshToken,
        accessToken,
        deviceId: deviceInfo.deviceId,
        devicePlatform: platform,
        deviceModel: deviceInfo.deviceModel,
        appVersion: deviceInfo.appVersion,
        deviceToken: deviceInfo.deviceToken,
        ipAddress,
        userAgent,
        expiresAt,
        isActive: true,
      },
    });

    // Clean up old sessions for this device (keep only latest)
    if (deviceInfo.deviceId) {
      await this.prisma.driverSession.updateMany({
        where: {
          driverId,
          deviceId: deviceInfo.deviceId,
          refreshToken: { not: refreshToken },
        },
        data: { isActive: false },
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async refreshSession(refreshToken: string, ipAddress?: string): Promise<SessionTokens> {
    const session = await this.prisma.driverSession.findUnique({
      where: { refreshToken },
      include: { driver: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!session.isActive) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (new Date() > session.expiresAt) {
      await this.prisma.driverSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    if (session.driver.status === DriverStatus.blocked || session.driver.status === DriverStatus.hard_reject) {
      throw new UnauthorizedException('Account is disabled');
    }

    const payload = { sub: session.driverId, type: 'driver' };
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiry });

    await this.prisma.driverSession.update({
      where: { id: session.id },
      data: {
        accessToken: newAccessToken,
        lastActiveAt: new Date(),
        ipAddress: ipAddress || session.ipAddress,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: session.refreshToken,
      expiresIn: 900,
    };
  }

  async validateSession(driverId: number, accessToken: string): Promise<boolean> {
    const session = await this.prisma.driverSession.findFirst({
      where: {
        driverId,
        accessToken,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    return !!session;
  }

  async getActiveSessions(driverId: number) {
    return this.prisma.driverSession.findMany({
      where: {
        driverId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        devicePlatform: true,
        deviceModel: true,
        appVersion: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  async revokeSession(driverId: number, sessionId: number) {
    const session = await this.prisma.driverSession.findFirst({
      where: { id: sessionId, driverId },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    await this.prisma.driverSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return { message: 'Session revoked successfully' };
  }

  async revokeAllOtherSessions(driverId: number, currentRefreshToken: string) {
    await this.prisma.driverSession.updateMany({
      where: {
        driverId,
        refreshToken: { not: currentRefreshToken },
      },
      data: { isActive: false },
    });

    return { message: 'All other sessions revoked' };
  }

  async revokeAllSessions(driverId: number) {
    await this.prisma.driverSession.updateMany({
      where: { driverId },
      data: { isActive: false },
    });

    return { message: 'All sessions revoked' };
  }

  async logout(refreshToken: string) {
    await this.prisma.driverSession.updateMany({
      where: { refreshToken },
      data: { isActive: false },
    });

    return { message: 'Logged out successfully' };
  }

  async updateDeviceToken(driverId: number, refreshToken: string, deviceToken: string) {
    await this.prisma.driverSession.updateMany({
      where: { driverId, refreshToken },
      data: { deviceToken },
    });

    return { message: 'Device token updated' };
  }

  async cleanupExpiredSessions() {
    const result = await this.prisma.driverSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false, lastActiveAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired driver sessions`);
    }
  }
}
