import prisma from '@/db/prisma';
import { getCached, setCache, invalidateCache } from '@/cache/redis';

export const SITE_LOCK_KEY = 'site-lock';

export async function isSiteLocked(): Promise<boolean> {
  try {
    const cached = await getCached<boolean>('cache:site-lock');
    if (cached !== null) return cached;

    const row = await prisma.siteContent.findUnique({ where: { key: SITE_LOCK_KEY } });
    const locked = row?.html?.trim() === '1';
    await setCache('cache:site-lock', locked, 60);
    return locked;
  } catch {
    return false;
  }
}

export async function setSiteLocked(locked: boolean) {
  const html = locked ? '1' : '0';
  await prisma.siteContent.upsert({
    where: { key: SITE_LOCK_KEY },
    create: { key: SITE_LOCK_KEY, html },
    update: { html },
  });
  await invalidateCache('cache:site-lock');
}
