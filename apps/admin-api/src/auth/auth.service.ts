import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const operator = await this.prisma.operator.findUnique({ where: { email } });

    if (!operator) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, operator.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!operator.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Update last login
    await this.prisma.operator.update({
      where: { id: operator.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: operator.id, email: operator.email, role: operator.role, type: 'admin' };
    return {
      accessToken: this.jwtService.sign(payload),
      operator: {
        id: operator.id,
        email: operator.email,
        firstName: operator.firstName,
        lastName: operator.lastName,
        role: operator.role,
      },
    };
  }

  async register(data: { firstName: string; lastName: string; email: string; password: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const operator = await this.prisma.operator.create({
      data: {
        ...data,
        password: hashedPassword,
        role: 'admin',
      },
    });

    const payload = { sub: operator.id, email: operator.email, role: operator.role, type: 'admin' };
    return {
      accessToken: this.jwtService.sign(payload),
      operator: {
        id: operator.id,
        email: operator.email,
        firstName: operator.firstName,
        lastName: operator.lastName,
        role: operator.role,
      },
    };
  }

  async validateOperator(id: number) {
    return this.prisma.operator.findUnique({ where: { id } });
  }

  async updateProfile(id: number, data: { firstName?: string; lastName?: string; email?: string }) {
    const operator = await this.prisma.operator.update({
      where: { id },
      data,
    });

    return {
      id: operator.id,
      email: operator.email,
      firstName: operator.firstName,
      lastName: operator.lastName,
      role: operator.role,
    };
  }

  async changePassword(id: number, currentPassword: string, newPassword: string) {
    const operator = await this.prisma.operator.findUnique({ where: { id } });

    if (!operator) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, operator.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.operator.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }
}
