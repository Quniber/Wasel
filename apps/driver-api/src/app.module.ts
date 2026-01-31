import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { DocumentsModule } from './documents/documents.module';
import { EarningsModule } from './earnings/earnings.module';
import { ServicesModule } from './services/services.module';
import { PaymentModule } from './payment/payment.module';
import { SocketModule } from './socket/socket.module';
import { SettingsModule } from './settings/settings.module';

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
    AuthModule,
    OrdersModule,
    DocumentsModule,
    EarningsModule,
    ServicesModule,
    PaymentModule,
    SocketModule,
    SettingsModule,
  ],
})
export class AppModule {}
