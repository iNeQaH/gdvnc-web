import { NextResponse } from 'next/server';
import { LevelMode } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { syncExternalListToDb } from '@/lib/externalLists';
import { triggerBackgroundPpRecalc } from '@/lib/upsertLevel';

export const maxDuration = 60;

const MODES = ['CLASSIC', 'PLATFORMER'] as const;

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`admin-list-sync:${getClientIp(req)}`, 4, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    let mode: 'CLASSIC' | 'PLATFORMER' | 'ALL' = 'ALL';
    try {
      const body = await req.json();
      if (body?.mode === 'CLASSIC' || body?.mode === 'PLATFORMER') mode = body.mode;
    } catch {
      // empty body is fine
    }

    const targets = mode === 'ALL' ? [...MODES] : [mode];
    const results = [];

    for (const target of targets) {
      const result = await syncExternalListToDb(target, { force: true });
      const levelMode = target === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
      if (result.affectedIds.length > 0) {
        void triggerBackgroundPpRecalc(result.affectedIds, levelMode);
      }
      results.push({
        mode: result.mode,
        synced: result.synced,
        created: result.created,
        updated: result.updated,
        stale: result.stale,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không lấy được danh sách từ API.' },
      { status: 502 }
    );
  }
}
