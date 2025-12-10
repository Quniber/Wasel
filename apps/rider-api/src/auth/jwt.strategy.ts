import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'taxi-secret-key',
    });
  }

  async validate(payload: { sub: number; email: string; type: string }) {
    if (payload.type !== 'customer') {
      throw new UnauthorizedException();
    }
    const customer = await this.authService.validateCustomer(payload.sub);
    if (!customer || customer.status !== 'enabled') {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email };
  }
}
