import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { DocumentsModule } from './documents/documents.module';
import { EarningsModule } from './earnings/earnings.module';
import { ServicesModule } from './services/services.module';
import { PaymentModule } from './payment/payment.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrdersModule,
    DocumentsModule,
    EarningsModule,
    ServicesModule,
    PaymentModule,
    SocketModule,
  ],
})
export class AppModule {}
