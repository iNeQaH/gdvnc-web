import { prisma } from '@/lib/prisma';

export const SITE_LOCK_KEY = 'site-lock';

export async function isSiteLocked(): Promise<boolean> {
  try {
    const row = await prisma.siteContent.findUnique({ where: { key: SITE_LOCK_KEY } });
    return row?.html?.trim() === '1';
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
}
