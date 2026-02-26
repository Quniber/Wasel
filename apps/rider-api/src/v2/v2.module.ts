import { Module } from '@nestjs/common';
import { AuthV2Module } from './auth/auth.module';

@Module({
  imports: [AuthV2Module],
})
export class V2Module {}
