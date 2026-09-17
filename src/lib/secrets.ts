import crypto from 'crypto';

function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set to a long random string (at least 32 characters) in production.`);
  }
  return value && value.length >= 8 ? value : devFallback;
}

export function jwtSecretBytes(): Uint8Array {
  return new TextEncoder().encode(requireSecret('JWT_SECRET', 'dev-only-jwt-secret-change-me'));
}

/** Dedicated CAPTCHA secret, or HMAC-derived from JWT (never reuse JWT bytes directly). */
export function captchaSecret(): string {
  const dedicated = process.env.CAPTCHA_SECRET;
  if (dedicated && dedicated.length >= 32) return dedicated;
  const jwt = requireSecret('JWT_SECRET', 'dev-only-jwt-secret-change-me');
  return crypto.createHmac('sha256', jwt).update('gdvnc-captcha-v1').digest('hex');
}
