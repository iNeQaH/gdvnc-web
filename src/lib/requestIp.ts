/** Client IP from the edge/proxy, not spoofable X-Forwarded-For. */
export function getClientIp(req: Request): string {
  const trusted =
    req.headers.get('x-vercel-forwarded-for') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('true-client-ip');
  if (trusted) {
    const first = trusted.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  if (process.env.NODE_ENV !== 'production') {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first.slice(0, 64);
    }
    return req.headers.get('x-real-ip')?.slice(0, 64) || 'unknown';
  }
  return 'unknown';
}
