import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { syncGdvnSheet } from '@/lib/syncGdvnSheet';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`admin-sheet-sync:${getClientIp(req)}`, 4, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const result = await syncGdvnSheet();
    bustPublicCache(CACHE_TAGS.levels, CACHE_TAGS.highlights, CACHE_TAGS.timeline);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không đồng bộ được Google Sheet.' },
      { status: 502 }
    );
  }
}
