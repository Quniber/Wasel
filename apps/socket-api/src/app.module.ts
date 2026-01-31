import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { SocketModule } from './socket/socket.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '/var/www/Wasel/.env',                      // Server absolute path
        join(__dirname, '..', '..', '..', '.env'),  // Root .env
        '.env',                                      // Local fallback
      ],
    }),
    SocketModule,
    ApiModule,
  ],
})
export class AppModule {}
