import { Module } from '@nestjs/common';
import { AuthV2Controller } from './auth.controller';
import { AuthV2Service } from './auth.service';
import { AuthModule } from '../../v1/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AuthV2Controller],
  providers: [AuthV2Service],
})
export class AuthV2Module {}
