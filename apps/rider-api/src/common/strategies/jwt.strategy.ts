import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../v1/auth/auth.service';
import { SessionsService } from '../../v1/sessions/sessions.service';

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
    if (payload.type !== 'customer') {
      throw new UnauthorizedException();
    }
    const customer = await this.authService.validateCustomer(payload.sub);
    if (!customer || customer.status !== 'enabled') {
      throw new UnauthorizedException();
    }

    // Validate session is active (if sessions exist for this customer)
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token) {
      const hasAnySessions = await this.sessionsService.hasActiveSessions(payload.sub);
      if (hasAnySessions) {
        const isValidSession = await this.sessionsService.validateSession(token);
        if (!isValidSession) {
          throw new UnauthorizedException('Session expired or revoked');
        }
      }
    }

    return { id: payload.sub, email: payload.email };
  }
}
