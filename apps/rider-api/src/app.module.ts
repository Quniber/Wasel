import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { AddressesModule } from './addresses/addresses.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { PaymentModule } from './payment/payment.module';
import { CouponsModule } from './coupons/coupons.module';
import { SocketModule } from './socket/socket.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SessionsModule } from './sessions/sessions.module';
import { SkipCashModule } from './skipcash/skipcash.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '/var/www/wasel/.env',                      // Server absolute path
        join(__dirname, '..', '..', '..', '..', '.env'), // From dist/src to root
        join(__dirname, '..', '..', '..', '.env'), // Fallback
        '.env',                                     // Local fallback
      ],
    }),
    PrismaModule,
    AuthModule,
    OrdersModule,
    AddressesModule,
    WalletModule,
    PaymentMethodsModule,
    PaymentModule,
    CouponsModule,
    SocketModule,
    NotificationsModule,
    SessionsModule,
    SkipCashModule,
  ],
})
export class AppModule {}
