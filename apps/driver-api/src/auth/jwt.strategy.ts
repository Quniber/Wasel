import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { DriverStatus } from 'database';

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
    if (payload.type !== 'driver') {
      throw new UnauthorizedException();
    }
    const driver = await this.authService.validateDriver(payload.sub);
    // Check if driver exists and is not blocked
    if (!driver || driver.status === DriverStatus.blocked || driver.status === DriverStatus.hard_reject) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email };
  }
}
