import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { InternalController } from './internal.controller';
import { OrdersService } from './orders.service';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [SocketModule],
  controllers: [OrdersController, InternalController],
  providers: [OrdersService],
})
export class OrdersModule {}
