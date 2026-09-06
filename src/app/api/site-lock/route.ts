import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { isSiteLocked, setSiteLocked } from '@/lib/siteLock';
import { SHORT_CACHE_HEADERS } from '@/lib/publicCache';

export async function GET() {
  try {
    const locked = await isSiteLocked();
    return NextResponse.json({ success: true, locked }, { headers: SHORT_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ success: true, locked: false }, { headers: SHORT_CACHE_HEADERS });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const locked = body?.locked === true;
    await setSiteLocked(locked);
    return NextResponse.json({ success: true, locked });
  } catch (error) {
    console.error('site-lock PATCH', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
