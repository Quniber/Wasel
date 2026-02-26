import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'customer') {
        throw new UnauthorizedException('Invalid token type');
      }

      const customer = await this.prisma.customer.findUnique({
        where: { id: payload.sub },
      });

      if (!customer) {
        throw new UnauthorizedException('Customer not found');
      }

      request.customer = customer;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
