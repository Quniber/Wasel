import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DriverAuthModule } from './driver-auth/driver-auth.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomersModule } from './customers/customers.module';
import { DriversModule } from './drivers/drivers.module';
import { FleetsModule } from './fleets/fleets.module';
import { ServicesModule } from './services/services.module';
import { OrdersModule } from './orders/orders.module';
import { SettingsModule } from './settings/settings.module';
import { OperatorsModule } from './operators/operators.module';
import { PaymentModule } from './payment/payment.module';
import { CouponsModule } from './coupons/coupons.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
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
export class V1Module {}
