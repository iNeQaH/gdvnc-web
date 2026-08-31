import { NextResponse } from 'next/server';
import { requireFullAdmin } from '@/lib/auth';
import { isSiteLocked, setSiteLocked } from '@/lib/siteLock';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const locked = await isSiteLocked();
    return NextResponse.json({ success: true, locked });
  } catch {
    return NextResponse.json({ success: true, locked: false });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireFullAdmin();
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
