import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const SITE_LOCK_KEY = 'site-lock';

const CACHE_MS = 15_000;
let lockCache: { at: number; locked: boolean } | null = null;

export async function isSiteLocked(): Promise<boolean> {
  if (lockCache && Date.now() - lockCache.at < CACHE_MS) return lockCache.locked;
  try {
    const row = await prisma.siteContent.findUnique({ where: { key: SITE_LOCK_KEY } });
    const locked = row?.html?.trim() === '1';
    lockCache = { at: Date.now(), locked };
    return locked;
  } catch {
    return false;
  }
}

export async function checkSiteLockAndBlock() {
  const locked = await isSiteLocked();
  if (locked) {
    return NextResponse.json(
      { error: 'Trang web đang bảo trì.', success: false, data: [] },
      { status: 503 }
    );
  }
  return null;
}

export async function setSiteLocked(locked: boolean) {
  const html = locked ? '1' : '0';
  await prisma.siteContent.upsert({
    where: { key: SITE_LOCK_KEY },
    create: { key: SITE_LOCK_KEY, html },
    update: { html },
  });
  lockCache = { at: Date.now(), locked };
}
