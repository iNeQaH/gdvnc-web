import crypto from 'crypto';
import { captchaSecret } from '@/services/secrets';

const TTL_MS = 10 * 60 * 1000;
const PREFIX = 'verified_human_';
export const POW_DIFFICULTY = 4;

const usedJti = new Map<string, number>();

function hmac(payload: string): string {
  return crypto.createHmac('sha256', captchaSecret()).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function ipFingerprint(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

function pruneUsed(now: number) {
  if (usedJti.size < 3000) return;
  for (const [jti, exp] of usedJti) {
    if (exp <= now) usedJti.delete(jti);
  }
}

function parseSigned(token: string): { payload: string; signature: string } | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  return { payload: token.slice(0, dot), signature: token.slice(dot + 1) };
}

export function issuePowChallenge(ip: string): { seed: string; difficulty: number } {
  const ts = Date.now();
  const payload = `${ts}.${ipFingerprint(ip)}`;
  return { seed: `${payload}.${hmac(payload)}`, difficulty: POW_DIFFICULTY };
}

export function verifyPowSolution(ip: string, seed: unknown, nonce: unknown): boolean {
  if (typeof seed !== 'string' || typeof nonce !== 'string') return false;
  if (!/^[0-9a-zA-Z]{1,16}$/.test(nonce)) return false;

  const parsed = parseSigned(seed);
  if (!parsed) return false;
  const { payload, signature } = parsed;
  const firstDot = payload.indexOf('.');
  if (firstDot <= 0) return false;
  const ts = Number(payload.slice(0, firstDot));
  const fp = payload.slice(firstDot + 1);
  if (!Number.isFinite(ts) || fp !== ipFingerprint(ip)) return false;
  if (!safeEqual(hmac(payload), signature)) return false;
  const age = Date.now() - ts;
  if (age < 0 || age > TTL_MS) return false;

  const digest = crypto.createHash('sha256').update(`${seed}:${nonce}`).digest('hex');
  return digest.startsWith('0'.repeat(POW_DIFFICULTY));
}

export function issueCaptchaToken(ip: string): string {
  const jti = crypto.randomBytes(8).toString('hex');
  const payload = `${PREFIX}${Date.now()}_${ipFingerprint(ip)}_${jti}`;
  return `${payload}.${hmac(payload)}`;
}

function parseCaptchaPayload(token: unknown): { ts: number; fp: string; jti: string } | null {
  if (typeof token !== 'string') return null;
  const parsed = parseSigned(token);
  if (!parsed) return null;
  const { payload, signature } = parsed;
  if (!payload.startsWith(PREFIX) || !safeEqual(hmac(payload), signature)) return null;
  const rest = payload.slice(PREFIX.length);
  const parts = rest.split('_');
  if (parts.length !== 3) return null;
  const ts = Number(parts[0]);
  const fp = parts[1];
  const jti = parts[2];
  if (!Number.isFinite(ts) || !fp || !jti) return null;
  const age = Date.now() - ts;
  if (age < 0 || age > TTL_MS) return null;
  return { ts, fp, jti };
}

export function verifyCaptchaToken(token: unknown, ip: string): boolean {
  const parsed = parseCaptchaPayload(token);
  if (!parsed) return false;
  return parsed.fp === ipFingerprint(ip);
}

export function consumeCaptchaToken(token: unknown, ip: string): boolean {
  const parsed = parseCaptchaPayload(token);
  if (!parsed || parsed.fp !== ipFingerprint(ip)) return false;
  const now = Date.now();
  pruneUsed(now);
  if (usedJti.has(parsed.jti)) return false;
  usedJti.set(parsed.jti, parsed.ts + TTL_MS);
  return true;
}

export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== 'string' || token.length < 8) return false;
  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
