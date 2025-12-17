import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
