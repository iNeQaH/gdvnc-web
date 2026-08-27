import crypto from 'crypto';
import { captchaSecret } from '@/lib/secrets';

const TTL_MS = 10 * 60 * 1000;
const PREFIX = 'verified_human_';

function hmac(payload: string): string {
  return crypto.createHmac('sha256', captchaSecret()).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function issueCaptchaToken(): string {
  const payload = `${PREFIX}${Date.now()}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifyCaptchaToken(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!payload.startsWith(PREFIX) || !safeEqual(hmac(payload), signature)) return false;
  const ts = Number(payload.slice(PREFIX.length));
  if (!Number.isFinite(ts)) return false;
  const age = Date.now() - ts;
  return age >= 0 && age <= TTL_MS;
}
