import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { SmsService, RecipientMode } from './sms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({ path: 'sms', version: '1' })
@UseGuards(JwtAuthGuard)
export class SmsController {
  constructor(private smsService: SmsService) {}

  @Post('send')
  send(
    @Req() req: any,
    @Body() body: {
      body: string;
      language?: 'en' | 'ar';
      mode: RecipientMode;
      manualNumbers?: string[];
    },
  ) {
    const operatorId = req.user?.id;
    return this.smsService.sendBulk(body, operatorId);
  }

  @Get('preview')
  preview(
    @Query('mode') mode: RecipientMode,
    @Query('manualNumbers') manualNumbersJson?: string,
  ) {
    let manualNumbers: string[] | undefined;
    if (manualNumbersJson) {
      try {
        const parsed = JSON.parse(manualNumbersJson);
        if (Array.isArray(parsed)) manualNumbers = parsed.map(String);
      } catch {}
    }
    return this.smsService.previewRecipients(mode, manualNumbers);
  }

  @Get('messages')
  listMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.smsService.listMessages({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      batchId,
    });
  }

  @Get('batches')
  listBatches(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.smsService.listBatches({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
