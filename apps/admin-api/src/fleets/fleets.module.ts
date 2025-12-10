import { Module } from '@nestjs/common';
import { FleetsController } from './fleets.controller';
import { FleetsService } from './fleets.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FleetsController],
  providers: [FleetsService],
  exports: [FleetsService],
})
export class FleetsModule {}
