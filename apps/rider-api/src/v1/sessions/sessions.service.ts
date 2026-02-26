import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { DevicePlatform } from 'database';

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
export class SessionsService {
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: number; // days

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.accessTokenExpiry = '15m'; // 15 minutes
    this.refreshTokenExpiry = 30; // 30 days
  }

  // Generate a random refresh token
  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  // Create a new session for customer
  async createSession(
    customerId: number,
    deviceInfo: DeviceInfo,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SessionTokens> {
    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiry);

    // Generate access token
    const payload = { sub: customerId, type: 'customer' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiry });

    // Map device platform
    let platform: DevicePlatform | null = null;
    if (deviceInfo.devicePlatform === 'ios') platform = DevicePlatform.ios;
    else if (deviceInfo.devicePlatform === 'android') platform = DevicePlatform.android;
    else if (deviceInfo.devicePlatform === 'web') platform = DevicePlatform.web;

    // Create session in database
    await this.prisma.customerSession.create({
      data: {
        customerId,
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
      await this.prisma.customerSession.updateMany({
        where: {
          customerId,
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

  // Refresh access token using refresh token
  async refreshSession(refreshToken: string, ipAddress?: string): Promise<SessionTokens> {
    const session = await this.prisma.customerSession.findUnique({
      where: { refreshToken },
      include: { customer: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!session.isActive) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (new Date() > session.expiresAt) {
      // Mark session as inactive
      await this.prisma.customerSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    if (session.customer.status !== 'enabled') {
      throw new UnauthorizedException('Account is disabled');
    }

    // Generate new access token
    const payload = { sub: session.customerId, type: 'customer' };
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiry });

    // Update session
    await this.prisma.customerSession.update({
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

  // Validate session by access token
  async validateSession(accessToken: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(accessToken);

      // Check if session exists and is active
      const session = await this.prisma.customerSession.findFirst({
        where: {
          customerId: payload.sub,
          accessToken,
          isActive: true,
        },
      });

      return !!session;
    } catch {
      return false;
    }
  }

  // Get all active sessions for a customer
  async getActiveSessions(customerId: number) {
    const sessions = await this.prisma.customerSession.findMany({
      where: {
        customerId,
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

    return sessions;
  }

  // Revoke a specific session
  async revokeSession(customerId: number, sessionId: number) {
    const session = await this.prisma.customerSession.findFirst({
      where: { id: sessionId, customerId },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    await this.prisma.customerSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return { message: 'Session revoked successfully' };
  }

  // Revoke all sessions except current
  async revokeAllOtherSessions(customerId: number, currentRefreshToken: string) {
    await this.prisma.customerSession.updateMany({
      where: {
        customerId,
        refreshToken: { not: currentRefreshToken },
      },
      data: { isActive: false },
    });

    return { message: 'All other sessions revoked' };
  }

  // Revoke all sessions (for logout everywhere)
  async revokeAllSessions(customerId: number) {
    await this.prisma.customerSession.updateMany({
      where: { customerId },
      data: { isActive: false },
    });

    return { message: 'All sessions revoked' };
  }

  // Logout - revoke current session
  async logout(refreshToken: string) {
    await this.prisma.customerSession.updateMany({
      where: { refreshToken },
      data: { isActive: false },
    });

    return { message: 'Logged out successfully' };
  }

  // Update device token (for push notifications)
  async updateDeviceToken(customerId: number, refreshToken: string, deviceToken: string) {
    await this.prisma.customerSession.updateMany({
      where: { customerId, refreshToken },
      data: { deviceToken },
    });

    return { message: 'Device token updated' };
  }

  // Clean up expired sessions (can be run as a cron job)
  async cleanupExpiredSessions() {
    const result = await this.prisma.customerSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false, lastActiveAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    return { deletedCount: result.count };
  }
}
