import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SocketService } from './socket.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SocketService],
  exports: [SocketService],
})
export class SocketModule {}
