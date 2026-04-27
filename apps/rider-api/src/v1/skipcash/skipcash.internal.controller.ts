import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  ForbiddenException,
  BadRequestException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipCashService } from './skipcash.service';

interface InternalRefundDto {
  paymentId: string;
  amount?: number;
}

/**
 * Internal-only endpoints called by other services (e.g. admin-api).
 * Reachable at /api/internal/skipcash/* — protected by an INTERNAL_API_KEY header
 * since nginx exposes /api/internal/* externally via the /rider-api/ rewrite.
 */
@Controller({ path: 'internal/skipcash', version: VERSION_NEUTRAL })
export class InternalSkipCashController {
  private readonly logger = new Logger(InternalSkipCashController.name);
  private readonly internalKey: string;

  constructor(
    private skipCashService: SkipCashService,
    configService: ConfigService,
  ) {
    this.internalKey = configService.get<string>('INTERNAL_API_KEY', '');
  }

  @Post('refund')
  async refund(
    @Headers('x-internal-key') key: string | undefined,
    @Body() dto: InternalRefundDto,
  ) {
    if (!this.internalKey || key !== this.internalKey) {
      throw new ForbiddenException('Invalid internal key');
    }
    if (!dto.paymentId) {
      throw new BadRequestException('paymentId is required');
    }

    const result = await this.skipCashService.refund(dto.paymentId, dto.amount);
    return result;
  }
}
