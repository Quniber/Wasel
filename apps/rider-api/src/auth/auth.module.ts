import { Module, forwardRef, Logger } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { SessionsModule } from '../sessions/sessions.module';

const logger = new Logger('AuthModule');

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const jwtSecret = config.get<string>('JWT_SECRET');
        logger.log(`JWT_SECRET loaded: ${jwtSecret ? jwtSecret.substring(0, 10) + '...' : 'NOT FOUND - using fallback'}`);
        return {
          secret: jwtSecret || 'taxi-secret-key',
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
    forwardRef(() => SessionsModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
