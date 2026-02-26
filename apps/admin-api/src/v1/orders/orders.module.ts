import { Module } from '@nestjs/common';
import { OrdersController, InternalOrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [SocketModule],
  controllers: [OrdersController, InternalOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
