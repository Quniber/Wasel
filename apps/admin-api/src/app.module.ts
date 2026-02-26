import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PrismaModule } from './common/prisma/prisma.module';
import { V1Module } from './v1/v1.module';

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
    PrismaModule,
    V1Module,
  ],
})
export class AppModule {}
