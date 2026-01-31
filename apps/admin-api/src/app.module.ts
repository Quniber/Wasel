import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { DriversModule } from './drivers/drivers.module';
import { ServicesModule } from './services/services.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FleetsModule } from './fleets/fleets.module';
import { SettingsModule } from './settings/settings.module';
import { OperatorsModule } from './operators/operators.module';
import { PaymentModule } from './payment/payment.module';
import { CouponsModule } from './coupons/coupons.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { SocketModule } from './socket/socket.module';
import { DriverAuthModule } from './driver-auth/driver-auth.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';

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
    DriverAuthModule,
    CustomerAuthModule,
    DashboardModule,
    CustomersModule,
    DriversModule,
    FleetsModule,
    ServicesModule,
    OrdersModule,
    SettingsModule,
    OperatorsModule,
    PaymentModule,
    CouponsModule,
    ComplaintsModule,
    SocketModule,
  ],
})
export class AppModule {}
