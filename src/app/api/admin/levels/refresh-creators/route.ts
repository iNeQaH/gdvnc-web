import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { refreshLevelCreatorNames } from '@/lib/gdRefreshJobs';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`admin-refresh-creators:${getClientIp(req)}`, 80, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    let cursor: string | null = null;
    try {
      const body = await req.json();
      if (typeof body?.cursor === 'string' && body.cursor) cursor = body.cursor;
    } catch {
      // empty body is fine
    }
    const result = await refreshLevelCreatorNames(cursor);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không lấy được tên creator từ GD.' },
      { status: 502 }
    );
  }
}
