import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { sendSms, normalizePhone, SmsNotConfiguredError } from '@taxi/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export type RecipientMode = 'customers' | 'drivers' | 'manual';

export interface SendBulkInput {
  body: string;
  language?: 'en' | 'ar';
  mode: RecipientMode;
  manualNumbers?: string[];
}

interface ResolvedRecipient {
  phone: string;          // raw, what was given
  normalized: string;     // post-normalize, what's stored in sms_messages
  name?: string;
  type: 'customer' | 'driver' | 'manual';
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private prisma: PrismaService) {}

  async sendBulk(input: SendBulkInput, operatorId: number) {
    if (!input.body || !input.body.trim()) {
      throw new BadRequestException('SMS body is required');
    }
    if (!['customers', 'drivers', 'manual'].includes(input.mode)) {
      throw new BadRequestException('Invalid recipient mode');
    }

    const recipients = await this.resolveRecipients(input);
    if (recipients.length === 0) {
      throw new BadRequestException('No recipients matched');
    }

    const batchId = crypto.randomUUID();
    let successCount = 0;
    let failedCount = 0;

    // Sequential dispatch — Ooredoo's BMS happily accepts parallel calls
    // but we want one log row per recipient with a clean status, and a
    // single-stream pace makes failures easier to read.
    for (const r of recipients) {
      const row = await this.prisma.smsMessage.create({
        data: {
          batchId,
          body: input.body,
          language: input.language ?? null,
          recipient: r.normalized,
          recipientName: r.name ?? null,
          recipientType: r.type,
          status: 'pending',
          sentById: operatorId,
        },
      });

      try {
        const result = await sendSms({
          to: r.phone,
          body: input.body,
          language: input.language,
        });
        await this.prisma.smsMessage.update({
          where: { id: row.id },
          data: {
            status: result.ok ? 'sent' : 'failed',
            transactionId: result.transactionId ?? null,
            errorMessage: result.ok ? null : (result.errorMessage ?? result.rawResult),
            sentAt: result.ok ? new Date() : null,
          },
        });
        if (result.ok) successCount++;
        else failedCount++;
      } catch (err: any) {
        const message = err instanceof SmsNotConfiguredError
          ? 'SMS provider not configured (OOREDOO_SMS_* env vars missing)'
          : (err?.message || String(err));
        await this.prisma.smsMessage.update({
          where: { id: row.id },
          data: { status: 'failed', errorMessage: message },
        });
        failedCount++;
        this.logger.warn(`SMS to ${r.normalized} failed: ${message}`);
      }
    }

    return {
      batchId,
      totalRecipients: recipients.length,
      successCount,
      failedCount,
    };
  }

  private async resolveRecipients(input: SendBulkInput): Promise<ResolvedRecipient[]> {
    if (input.mode === 'customers') {
      const customers = await this.prisma.customer.findMany({
        where: { status: 'enabled', mobileNumber: { not: '' } },
        select: { mobileNumber: true, firstName: true, lastName: true },
      });
      return customers
        .filter((c) => c.mobileNumber)
        .map((c) => ({
          phone: c.mobileNumber,
          normalized: normalizePhone(c.mobileNumber),
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || undefined,
          type: 'customer' as const,
        }));
    }

    if (input.mode === 'drivers') {
      const drivers = await this.prisma.driver.findMany({
        where: { mobileNumber: { not: '' }, status: { notIn: ['blocked', 'hard_reject'] } },
        select: { mobileNumber: true, firstName: true, lastName: true },
      });
      return drivers
        .filter((d) => d.mobileNumber)
        .map((d) => ({
          phone: d.mobileNumber,
          normalized: normalizePhone(d.mobileNumber),
          name: [d.firstName, d.lastName].filter(Boolean).join(' ') || undefined,
          type: 'driver' as const,
        }));
    }

    // mode === 'manual'
    const raw = (input.manualNumbers ?? []).map((n) => n.trim()).filter(Boolean);
    if (raw.length === 0) {
      throw new BadRequestException('At least one phone number is required for manual mode');
    }
    // De-dupe by normalized form so the same number entered twice in two
    // different formats doesn't get spammed twice.
    const seen = new Set<string>();
    const out: ResolvedRecipient[] = [];
    for (const phone of raw) {
      const normalized = normalizePhone(phone);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push({ phone, normalized, type: 'manual' });
    }
    return out;
  }

  // For the recipient preview before sending — same query as resolveRecipients
  // but returns just the count so the UI can show "Send to 482 customers?".
  async previewRecipients(mode: RecipientMode, manualNumbers?: string[]) {
    const r = await this.resolveRecipients({ mode, manualNumbers, body: 'preview' });
    return { count: r.length };
  }

  async listMessages(opts: { page?: number; limit?: number; batchId?: string }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const where = opts.batchId ? { batchId: opts.batchId } : {};
    const [messages, total] = await Promise.all([
      this.prisma.smsMessage.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.smsMessage.count({ where }),
    ]);
    return { messages, total, page, limit };
  }

  // Aggregated view: one row per batch with counts. Useful for the
  // history table in the admin UI.
  async listBatches(opts: { page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 20));

    // MySQL grouping — we want most recent batches first.
    const batches = await this.prisma.$queryRawUnsafe<Array<{
      batchId: string | null;
      body: string;
      recipientType: string;
      sentById: number | null;
      total: bigint | number;
      success: bigint | number;
      failed: bigint | number;
      pending: bigint | number;
      firstCreatedAt: Date;
    }>>(`
      SELECT
        batchId,
        ANY_VALUE(body) AS body,
        ANY_VALUE(recipientType) AS recipientType,
        ANY_VALUE(sentById) AS sentById,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        MIN(createdAt) AS firstCreatedAt
      FROM sms_messages
      WHERE batchId IS NOT NULL
      GROUP BY batchId
      ORDER BY firstCreatedAt DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `);

    // Convert BigInt → Number so JSON.stringify doesn't blow up.
    return {
      batches: batches.map((b) => ({
        ...b,
        total: Number(b.total),
        success: Number(b.success),
        failed: Number(b.failed),
        pending: Number(b.pending),
      })),
      page,
      limit,
    };
  }
}
