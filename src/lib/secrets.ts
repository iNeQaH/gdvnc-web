function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length >= 8) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set to a long random value in production.`);
  }
  return devFallback;
}

export function jwtSecretBytes(): Uint8Array {
  return new TextEncoder().encode(requireSecret('JWT_SECRET', 'dev-only-jwt-secret-change-me'));
}

export function captchaSecret(): string {
  return requireSecret('CAPTCHA_SECRET', 'dev-only-captcha-secret');
}
