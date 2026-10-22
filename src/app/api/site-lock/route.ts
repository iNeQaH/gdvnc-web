import { isBrowserSameOriginFetch } from '@/lib/origin';
import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { isSiteLocked, setSiteLocked } from '@/lib/siteLock';
import { SHORT_CACHE_HEADERS } from '@/lib/publicCache';
import { publicApiError } from '@/lib/apiError';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/requestIp';

export async function GET() {
  try {
    const locked = await isSiteLocked();
    return NextResponse.json({ success: true, locked }, { headers: SHORT_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ success: true, locked: false }, { headers: SHORT_CACHE_HEADERS });
  }
}

export async function PATCH(req: Request) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let auth;
  try {
    auth = await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const locked = body?.locked === true;
    await setSiteLocked(locked);
    await logAudit(auth?.userId || null, 'SET_SITE_LOCK', { locked }, getClientIp(req));
    return NextResponse.json({ success: true, locked });
  } catch (error) {
    return publicApiError(error, 'Không thể cập nhật trạng thái khoá site.', 500);
  }
}
