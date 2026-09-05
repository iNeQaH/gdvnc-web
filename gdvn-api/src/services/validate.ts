export function isHttpsUrl(value: string | null | undefined, maxLen = 500): boolean {
  if (!value) return false;
  if (value.length > maxLen) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function clipText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}
