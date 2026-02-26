import { Module } from '@nestjs/common';
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
export class V1Module {}
