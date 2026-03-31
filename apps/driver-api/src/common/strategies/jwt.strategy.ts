import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../v1/auth/auth.service';
import { SessionsService } from '../../v1/sessions/sessions.service';
import { DriverStatus } from 'database';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private sessionsService: SessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'taxi-secret-key',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: { sub: number; email: string; type: string }) {
    if (payload.type !== 'driver') {
      throw new UnauthorizedException();
    }
    const driver = await this.authService.validateDriver(payload.sub);
    if (!driver || driver.status === DriverStatus.blocked || driver.status === DriverStatus.hard_reject) {
      throw new UnauthorizedException();
    }

    // Validate session is active (if sessions exist for this driver)
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token) {
      const hasAnySessions = await this.sessionsService.hasActiveSessions(payload.sub);
      if (hasAnySessions) {
        const isValidSession = await this.sessionsService.validateSession(payload.sub, token);
        if (!isValidSession) {
          throw new UnauthorizedException('Session expired or revoked');
        }
      }
    }

    return { id: payload.sub, email: payload.email };
  }
}
