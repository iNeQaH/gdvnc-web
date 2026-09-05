import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const SITE_LOCK_KEY = 'site-lock';

export async function isSiteLocked(): Promise<boolean> {
  try {
    const row = await prisma.siteContent.findUnique({ where: { key: SITE_LOCK_KEY } });
    return row?.html?.trim() === '1';
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
}
