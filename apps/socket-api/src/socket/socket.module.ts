import { Module, Global, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './socket.service';

const logger = new Logger('SocketModule');

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const secret = jwtSecret || 'taxi-secret-key';
        logger.log(`JWT_SECRET from config: ${jwtSecret ? jwtSecret.substring(0, 10) + '...' : 'NOT FOUND, using fallback'}`);
        return {
          secret,
          signOptions: { expiresIn: '30d' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [SocketGateway, SocketService],
  exports: [SocketService, SocketGateway],
})
export class SocketModule {}
