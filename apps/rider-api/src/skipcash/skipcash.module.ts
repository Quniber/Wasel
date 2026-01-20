import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SkipCashService } from './skipcash.service';
import { SkipCashController } from './skipcash.controller';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [SkipCashController],
  providers: [SkipCashService],
  exports: [SkipCashService],
})
export class SkipCashModule {}
