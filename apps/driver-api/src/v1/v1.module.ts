import { Module } from '@nestjs/common';
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
export class V1Module {}
