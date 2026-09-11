import { NextResponse } from 'next/server';
import { clearAuthCookie, getAuthUser, bumpTokenVersion } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getAuthUser();
    if (user?.userId) {
      await bumpTokenVersion(user.userId);
    }
  } catch {
    /* ignore */
  }
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}

