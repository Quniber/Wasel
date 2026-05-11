import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { sendSms, normalizePhone, SmsNotConfiguredError } from '@taxi/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

// Test account bypass — same convention used elsewhere. Any number ending
// in 55555555 skips Ooredoo and accepts 123456 as the OTP.
const TEST_PHONE_SUFFIX = '55555555';
const TEST_OTP_CODE = '123456';

const OTP_TTL_MIN = 5;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private prisma: PrismaService) {}

  isTestNumber(mobileNumber: string): boolean {
    return mobileNumber.replace(/\D/g, '').endsWith(TEST_PHONE_SUFFIX);
  }

  // Hash with HMAC-SHA256 + JWT_SECRET so the DB never holds the OTP in
  // plaintext. JWT_SECRET is already required for the app to run, so we
  // don't add a new env var just for this.
  private hash(code: string): string {
    return crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'fallback-otp-key')
      .update(code)
      .digest('hex');
  }

  // Generates a 6-digit code, stores its hash, sends it via Ooredoo SMS,
  // and invalidates any previously-pending OTPs for the same recipient so
  // an attacker can't keep a stale one alive forever.
  async sendOtp(mobileNumber: string, purpose: string): Promise<void> {
    if (this.isTestNumber(mobileNumber)) return;

    const recipient = normalizePhone(mobileNumber);

    // Invalidate any unused, unexpired OTPs for this recipient + purpose.
    await this.prisma.otpCode.updateMany({
      where: { recipient, purpose, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    // 6-digit, leading zeros allowed.
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000);

    await this.prisma.otpCode.create({
      data: {
        recipient,
        codeHash: this.hash(code),
        purpose,
        expiresAt,
      },
    });

    try {
      const result = await sendSms({
        to: mobileNumber,
        body: `Your WaselGo Driver verification code is ${code}. It expires in ${OTP_TTL_MIN} minutes.`,
      });
      if (!result.ok) {
        this.logger.warn(`Ooredoo send failed for ${recipient}: ${result.errorMessage} (raw=${result.rawResult})`);
        // We don't throw — the code is already stored, so the user can
        // retry from the client without a server-side ghost. Throwing
        // would mislead the client into thinking nothing was issued.
      }
    } catch (err) {
      if (err instanceof SmsNotConfiguredError) {
        this.logger.error('OOREDOO_SMS_* env vars are missing — SMS not sent');
        throw new BadRequestException('SMS provider not configured');
      }
      this.logger.error(`Unexpected Ooredoo error for ${recipient}: ${err}`);
    }
  }

  // Returns true if the OTP is valid + freshly used. Returns false for any
  // wrong/expired/used/locked state — the caller surfaces a generic error.
  async verifyOtp(mobileNumber: string, code: string, purpose: string): Promise<boolean> {
    if (this.isTestNumber(mobileNumber)) return code === TEST_OTP_CODE;

    const recipient = normalizePhone(mobileNumber);
    const codeHash = this.hash(code);

    const otp = await this.prisma.otpCode.findFirst({
      where: { recipient, purpose, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return false;

    if (otp.expiresAt < new Date()) return false;
    if (otp.attempts >= MAX_ATTEMPTS) return false;

    if (otp.codeHash !== codeHash) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });
    return true;
  }
}
