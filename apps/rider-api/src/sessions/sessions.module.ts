import { Module, forwardRef, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

const logger = new Logger('SessionsModule');

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get('JWT_SECRET');
        logger.log(`JWT_SECRET: ${jwtSecret ? jwtSecret.substring(0, 10) + '...' : 'NOT FOUND'}`);
        return {
          secret: jwtSecret || 'taxi-secret-key',
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
    forwardRef(() => AuthModule),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
