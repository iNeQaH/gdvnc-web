import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export function createRateLimiter(prefix: string, tokens: number, windowMs: number) {
  return new Ratelimit({
    redis,
    prefix,
    limiter: Ratelimit.fixedWindow(tokens, `${windowMs}ms`),
  });
}

export async function getCached<T>(key: string): Promise<T | null> {
  return redis.get<T>(key);
}

export async function setCache(key: string, value: unknown, ttlSeconds: number) {
  await redis.set(key, value, { ex: ttlSeconds });
}

export async function invalidateCache(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(...keys);
}
