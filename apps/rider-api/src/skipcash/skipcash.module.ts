import { Module, Global } from '@nestjs/common';
import { SkipCashService } from './skipcash.service';
import { SkipCashController } from './skipcash.controller';

@Global()
@Module({
  controllers: [SkipCashController],
  providers: [SkipCashService],
  exports: [SkipCashService],
})
export class SkipCashModule {}
