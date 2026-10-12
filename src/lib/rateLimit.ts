type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

// Background cleanup every 60 seconds
if (typeof setInterval !== 'undefined') {
  const globalForRateLimit = globalThis as unknown as { rateLimitCleanupInterval?: NodeJS.Timeout };
  if (!globalForRateLimit.rateLimitCleanupInterval) {
    globalForRateLimit.rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    }, 60000);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  return { ok: true, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
}

export function rateLimitResponse(retryAfterSec: number, customMessage?: string) {
  const waitDuration =
    retryAfterSec >= 60
      ? `${Math.ceil(retryAfterSec / 60)} phút (${retryAfterSec} giây)`
      : `${retryAfterSec} giây`;

  const error = customMessage
    ? `${customMessage}. Vui lòng thử lại sau ${waitDuration}.`
    : `Thao tác quá thường xuyên. Vui lòng thử lại sau ${waitDuration}.`;

  return Response.json(
    {
      error,
      retryAfterSec,
      retryAfter: retryAfterSec,
      message: error,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  );
}
