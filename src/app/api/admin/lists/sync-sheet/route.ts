import { NextResponse } from 'next/server';
import { requireFullAdmin } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { syncGdvnSheet } from '@/lib/syncGdvnSheet';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`admin-sheet-sync:${getClientIp(req)}`, 4, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const result = await syncGdvnSheet();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không đồng bộ được Google Sheet.' },
      { status: 502 }
    );
  }
}
