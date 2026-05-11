// Ooredoo Qatar BMS HTTP SMS client.
//
// Provider docs are summarised in OOREDOO-SMS-SETUP.txt. Highlights that
// matter for callers of this module:
//   * Ooredoo allows traffic by IP-whitelist, not API key. The four env
//     vars below auth into the BMS account, but if the *server IP* hasn't
//     been added to Ooredoo's allowlist, every request silently TCP-times-
//     out. Email Ooredoo support with the public outbound IP.
//   * Endpoint is plain HTTP/HTTPS — no SDK, no library.
//   * Arabic bodies must be sent with messageType=ArabicWithLatinNumbers,
//     otherwise Ooredoo mangles them. We auto-detect.
//
// The module is pure: no DB, no NestJS, no logger. Callers handle logging
// and persistence.

export class SmsNotConfiguredError extends Error {
  constructor() {
    super('Ooredoo SMS env vars are missing (OOREDOO_SMS_CUSTOMER_ID, OOREDOO_SMS_USERNAME, OOREDOO_SMS_PASSWORD, OOREDOO_SMS_ORIGINATOR)');
    this.name = 'SmsNotConfiguredError';
  }
}

export interface SendSmsOptions {
  to: string;
  body: string;
  language?: 'en' | 'ar'; // override auto-detect
}

export interface SendSmsResult {
  ok: boolean;
  transactionId: string | null;
  rejectedNumbers: string[];
  rawResult: string; // Ooredoo's <Result> value verbatim — useful for logs
  errorMessage?: string;
}

const OOREDOO_ENDPOINT = 'https://messaging.ooredoo.qa/bms/soap/Messenger.asmx/HTTP_SendSms';

function getCredentials() {
  const customerID = process.env.OOREDOO_SMS_CUSTOMER_ID;
  const userName = process.env.OOREDOO_SMS_USERNAME;
  const userPassword = process.env.OOREDOO_SMS_PASSWORD;
  const originator = process.env.OOREDOO_SMS_ORIGINATOR;
  if (!customerID || !userName || !userPassword || !originator) {
    throw new SmsNotConfiguredError();
  }
  return { customerID, userName, userPassword, originator };
}

// Strip non-digits, prepend 974 if the result is exactly 8 digits.
// International numbers (already starting with a country code) pass through
// unchanged — Ooredoo's BMS will route or reject based on the contract.
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('974')) return digits;
  if (digits.length === 8) return `974${digits}`;
  return digits;
}

// Any character in the Arabic Unicode block flips us to Arabic mode.
// Ooredoo bills Arabic at the Unicode rate (70 chars/segment vs 160 for
// Latin), but they also mangle the body if you don't.
function detectLanguage(body: string): 'en' | 'ar' {
  return /[؀-ۿ]/.test(body) ? 'ar' : 'en';
}

// Parse Ooredoo's XML response. We use regex rather than an XML parser
// because the response shape is fixed and trivially small — adding a DOM
// dependency to ship 50 LOC isn't worth it.
function parseSendResult(xml: string): { result: string; transactionId: string; rejected: string } {
  const result = /<Result>([^<]*)<\/Result>/i.exec(xml)?.[1]?.trim() ?? '';
  const transactionId = /<TransactionID>([^<]*)<\/TransactionID>/i.exec(xml)?.[1]?.trim() ?? '';
  const rejected = /<RejectedNumbers>([^<]*)<\/RejectedNumbers>/i.exec(xml)?.[1]?.trim() ?? '';
  return { result, transactionId, rejected };
}

export async function sendSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  const { customerID, userName, userPassword, originator } = getCredentials();
  const phone = normalizePhone(opts.to);
  const lang = opts.language ?? detectLanguage(opts.body);
  const messageType = lang === 'ar' ? 'ArabicWithLatinNumbers' : 'Latin';

  const params = new URLSearchParams({
    customerID,
    userName,
    userPassword,
    originator,
    smsText: opts.body,
    recipientPhone: phone,
    messageType,
    defDate: '',
    blink: 'false',
    flash: 'false',
    Private: 'false',
  });

  const url = `${OOREDOO_ENDPOINT}?${params.toString()}`;

  let xml = '';
  try {
    const resp = await fetch(url, { method: 'GET' });
    xml = await resp.text();
    if (!resp.ok) {
      return {
        ok: false,
        transactionId: null,
        rejectedNumbers: [],
        rawResult: `HTTP ${resp.status}`,
        errorMessage: `Ooredoo returned HTTP ${resp.status}: ${xml.slice(0, 200)}`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      transactionId: null,
      rejectedNumbers: [],
      rawResult: 'NETWORK_ERROR',
      errorMessage: err?.message || String(err),
    };
  }

  const parsed = parseSendResult(xml);
  const ok = parsed.result.toUpperCase() === 'OK';
  return {
    ok,
    transactionId: parsed.transactionId || null,
    rejectedNumbers: parsed.rejected ? parsed.rejected.split(',').map(s => s.trim()).filter(Boolean) : [],
    rawResult: parsed.result || 'EMPTY_RESPONSE',
    errorMessage: ok ? undefined : `Ooredoo Result=${parsed.result || '(empty)'}`,
  };
}
