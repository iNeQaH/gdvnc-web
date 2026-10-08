import { NextResponse } from 'next/server';
import { clearAuthCookie, getAuthUser, bumpTokenVersion } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/requestIp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (user?.userId) {
      await bumpTokenVersion(user.userId);
      await logAudit(user.userId, 'LOGOUT', {}, getClientIp(req));
    }
  } catch {
    /* ignore */
  }
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}

