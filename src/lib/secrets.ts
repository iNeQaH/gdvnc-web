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
  const dedicated = process.env.CAPTCHA_SECRET;
  if (dedicated && dedicated.length >= 8) return dedicated;
  const jwt = process.env.JWT_SECRET;
  if (jwt && jwt.length >= 8) return jwt;
  return requireSecret('CAPTCHA_SECRET', 'dev-only-captcha-secret');
}
