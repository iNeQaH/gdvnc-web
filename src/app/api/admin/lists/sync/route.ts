import { publicApiError } from '@/lib/apiError';
import { NextResponse } from 'next/server';
import { LevelMode } from '@prisma/client';
import { requireSuperAdmin } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { syncExternalListToDb } from '@/lib/externalLists';
import { triggerBackgroundPpRecalc } from '@/lib/upsertLevel';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`admin-list-sync:${getClientIp(req)}`, 8, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    let mode: 'CLASSIC' | 'PLATFORMER' | 'ALL' | 'POINTERCRATE' | 'PEMONLIST' | 'AREDL_CLASSIC' | 'AREDL_PLATFORMER' = 'ALL';
    try {
      const body = await req.json();
      if (body?.mode) mode = body.mode;
    } catch {
      // empty body is fine
    }

    type TargetSpec = { mode: 'CLASSIC' | 'PLATFORMER'; source?: 'POINTERCRATE' | 'PEMONLIST' | 'AREDL_CLASSIC' | 'AREDL_PLATFORMER' };
    const targets: TargetSpec[] = [];
    if (mode === 'ALL') {
      targets.push({ mode: 'CLASSIC' }, { mode: 'PLATFORMER' });
    } else if (mode === 'CLASSIC') {
      targets.push({ mode: 'CLASSIC' });
    } else if (mode === 'PLATFORMER') {
      targets.push({ mode: 'PLATFORMER' });
    } else if (mode === 'POINTERCRATE') {
      targets.push({ mode: 'CLASSIC', source: 'POINTERCRATE' });
    } else if (mode === 'PEMONLIST') {
      targets.push({ mode: 'PLATFORMER', source: 'PEMONLIST' });
    } else if (mode === 'AREDL_CLASSIC') {
      targets.push({ mode: 'CLASSIC', source: 'AREDL_CLASSIC' });
    } else if (mode === 'AREDL_PLATFORMER') {
      targets.push({ mode: 'PLATFORMER', source: 'AREDL_PLATFORMER' });
    }

    const results = [];

    for (const target of targets) {
      const result = await syncExternalListToDb(target.mode, { force: true, source: target.source });
      const levelMode = target.mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
      if (result.affectedIds.length > 0) {
        await triggerBackgroundPpRecalc(result.affectedIds, levelMode);
      }
      results.push({
        mode: target.source || result.mode,
        synced: result.synced,
        created: result.created,
        updated: result.updated,
        stale: result.stale,
        source: result.source,
      });
    }

    bustPublicCache(CACHE_TAGS.levels, CACHE_TAGS.highlights, CACHE_TAGS.leaderboard);
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return publicApiError(error, 'Không lấy được danh sách từ API.', 502);
  }
}
