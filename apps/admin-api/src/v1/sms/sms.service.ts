import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { sendSms, normalizePhone, SmsNotConfiguredError } from '@taxi/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface RecipientSelection {
  driverIds?: number[];
  customerIds?: number[];
  manualNumbers?: string[];
}

export interface SendBulkInput extends RecipientSelection {
  body: string;
  language?: 'en' | 'ar';
  groupId?: number; // if set, takes priority over driverIds/customerIds/manualNumbers
}

interface ResolvedRecipient {
  phone: string;          // raw, what we hand to Ooredoo
  normalized: string;     // for the log
  name?: string;
  type: 'customer' | 'driver' | 'manual';
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private prisma: PrismaService) {}

  // ============ recipient listings (for the admin picker) ============

  async listDrivers(query?: string) {
    return this.prisma.driver.findMany({
      where: {
        status: { notIn: ['blocked', 'hard_reject'] },
        mobileNumber: { not: '' },
        ...(query ? {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { mobileNumber: { contains: query } },
            { email: { contains: query } },
          ],
        } : {}),
      },
      select: { id: true, firstName: true, lastName: true, mobileNumber: true, status: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 2000, // safety cap
    });
  }

  async listCustomers(query?: string) {
    return this.prisma.customer.findMany({
      where: {
        status: 'enabled',
        mobileNumber: { not: '' },
        ...(query ? {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { mobileNumber: { contains: query } },
            { email: { contains: query } },
          ],
        } : {}),
      },
      select: { id: true, firstName: true, lastName: true, mobileNumber: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 2000,
    });
  }

  // ============ groups CRUD ============

  async createGroup(data: { name: string } & RecipientSelection, operatorId?: number) {
    if (!data.name?.trim()) throw new BadRequestException('Group name is required');
    return this.prisma.smsGroup.create({
      data: {
        name: data.name.trim(),
        driverIds: data.driverIds ?? [],
        customerIds: data.customerIds ?? [],
        manualNumbers: data.manualNumbers ?? [],
        createdById: operatorId,
      },
    });
  }

  async listGroups() {
    return this.prisma.smsGroup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getGroup(id: number) {
    const g = await this.prisma.smsGroup.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Group not found');
    return g;
  }

  async updateGroup(id: number, data: { name?: string } & RecipientSelection) {
    await this.getGroup(id);
    return this.prisma.smsGroup.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.driverIds !== undefined ? { driverIds: data.driverIds } : {}),
        ...(data.customerIds !== undefined ? { customerIds: data.customerIds } : {}),
        ...(data.manualNumbers !== undefined ? { manualNumbers: data.manualNumbers } : {}),
      },
    });
  }

  async deleteGroup(id: number) {
    await this.getGroup(id);
    await this.prisma.smsGroup.delete({ where: { id } });
    return { ok: true };
  }

  // ============ send ============

  async sendBulk(input: SendBulkInput, operatorId?: number) {
    if (!input.body || !input.body.trim()) {
      throw new BadRequestException('SMS body is required');
    }

    let selection: RecipientSelection;
    if (input.groupId) {
      const g = await this.getGroup(input.groupId);
      selection = {
        driverIds: (g.driverIds as unknown as number[]) ?? [],
        customerIds: (g.customerIds as unknown as number[]) ?? [],
        manualNumbers: (g.manualNumbers as unknown as string[]) ?? [],
      };
    } else {
      selection = {
        driverIds: input.driverIds ?? [],
        customerIds: input.customerIds ?? [],
        manualNumbers: input.manualNumbers ?? [],
      };
    }

    const recipients = await this.resolveRecipients(selection);
    if (recipients.length === 0) {
      throw new BadRequestException('No recipients selected');
    }

    const batchId = crypto.randomUUID();
    let successCount = 0;
    let failedCount = 0;

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

    return { batchId, totalRecipients: recipients.length, successCount, failedCount };
  }

  // Resolve the mixed selection to a concrete list of phones. IDs are
  // looked up fresh — if a driver/customer changed their number after a
  // group was saved, we use the *current* number.
  private async resolveRecipients(sel: RecipientSelection): Promise<ResolvedRecipient[]> {
    const seen = new Set<string>();
    const out: ResolvedRecipient[] = [];

    if (sel.driverIds?.length) {
      const drivers = await this.prisma.driver.findMany({
        where: { id: { in: sel.driverIds } },
        select: { mobileNumber: true, firstName: true, lastName: true },
      });
      for (const d of drivers) {
        if (!d.mobileNumber) continue;
        const norm = normalizePhone(d.mobileNumber);
        if (seen.has(norm)) continue;
        seen.add(norm);
        out.push({
          phone: d.mobileNumber,
          normalized: norm,
          name: [d.firstName, d.lastName].filter(Boolean).join(' ') || undefined,
          type: 'driver',
        });
      }
    }

    if (sel.customerIds?.length) {
      const customers = await this.prisma.customer.findMany({
        where: { id: { in: sel.customerIds } },
        select: { mobileNumber: true, firstName: true, lastName: true },
      });
      for (const c of customers) {
        if (!c.mobileNumber) continue;
        const norm = normalizePhone(c.mobileNumber);
        if (seen.has(norm)) continue;
        seen.add(norm);
        out.push({
          phone: c.mobileNumber,
          normalized: norm,
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || undefined,
          type: 'customer',
        });
      }
    }

    for (const raw of sel.manualNumbers ?? []) {
      const phone = String(raw).trim();
      if (!phone) continue;
      const norm = normalizePhone(phone);
      if (seen.has(norm)) continue;
      seen.add(norm);
      out.push({ phone, normalized: norm, type: 'manual' });
    }

    return out;
  }

  // ============ history ============

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

  async listBatches(opts: { page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
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
