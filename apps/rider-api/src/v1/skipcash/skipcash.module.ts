import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SkipCashService } from './skipcash.service';
import { SkipCashController } from './skipcash.controller';
import { InternalSkipCashController } from './skipcash.internal.controller';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [SkipCashController, InternalSkipCashController],
  providers: [SkipCashService],
  exports: [SkipCashService],
})
export class SkipCashModule {}
