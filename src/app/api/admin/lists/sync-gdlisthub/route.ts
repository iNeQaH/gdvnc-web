import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { syncGdlisthubLists } from '@/lib/syncGdlisthubLists';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`admin-gdlisthub-sync:${getClientIp(req)}`, 4, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const result = await syncGdlisthubLists();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không đồng bộ được GDListHub.' },
      { status: 502 }
    );
  }
}
