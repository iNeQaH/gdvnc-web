/** Client IP — production trusts Cloudflare only; dev may use X-Forwarded-For. */
export function getClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp.slice(0, 64);

  if (process.env.NODE_ENV !== 'production') {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first.slice(0, 64);
    }
  }
  return 'unknown';
}
