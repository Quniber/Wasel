import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SocketService } from './socket.service';
import { DispatchService } from './dispatch.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  providers: [SocketService, DispatchService],
  exports: [SocketService, DispatchService],
})
export class SocketModule {}
