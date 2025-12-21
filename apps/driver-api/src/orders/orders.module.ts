import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { InternalController } from './internal.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController, InternalController],
  providers: [OrdersService],
})
export class OrdersModule {}
