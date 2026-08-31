import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import {
  getExternalList,
  mergeExternalWithDb,
  syncExternalListToDb,
  type ExternalListLevel,
} from '@/lib/externalLists';
import { compareListLevels, isLegacyTier } from '@/lib/levelSort';

const dbLevelSelect = {
  id: true,
  gdLevelId: true,
  name: true,
  mode: true,
  difficulty: true,
  difficultyFace: true,
  ratingType: true,
  isVN: true,
  isChallenge: true,
  placement: true,
  basePp: true,
  minPercent: true,
  creatorName: true,
  youtubeId: true,
  description: true,
  _count: { select: { records: { where: { status: RecordStatus.APPROVED } } } },
} as const;

function mapDbLevels(levels: Array<any>) {
  return levels.map(({ _count, ...rest }) => ({ ...rest, victorCount: _count.records }));
}

async function loadDbFallback(mode: string, tier: string | null, challenge: boolean) {
  const levels = await prisma.level.findMany({
    where: {
      isChallenge: challenge,
      ...(mode !== 'ALL' ? { mode: mode as LevelMode } : {}),
      ...(tier === 'main' ? { placement: { gte: 1, lte: 75 } }
        : tier === 'extended' ? { placement: { gte: 75, lte: 150 } }
        : tier === 'legacy' ? { OR: [{ placement: { gte: 151 } }, { placement: null }] }
        : {}),
    },
    select: dbLevelSelect,
  });
  return mapDbLevels(levels).sort(compareListLevels);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC';
    const tier = searchParams.get('tier');
    const challenge = searchParams.get('challenge') === '1';

    if (challenge) {
      const levels = await loadDbFallback(mode, tier, true);
      return NextResponse.json(
        { success: true, levels, source: 'database' },
        { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } }
      );
    }

    const modes: Array<'CLASSIC' | 'PLATFORMER'> =
      mode === 'PLATFORMER' ? ['PLATFORMER'] : mode === 'CLASSIC' ? ['CLASSIC'] : ['CLASSIC', 'PLATFORMER'];

    const externalResults = await Promise.all(
      modes.map(async (m) => {
        try {
          const list = await getExternalList(m);
          return { mode: m, list, ok: list.length > 0 };
        } catch (e) {
          console.error(`external list ${m} failed`, e);
          return { mode: m, list: [] as ExternalListLevel[], ok: false };
        }
      })
    );

    const anyExternalOk = externalResults.some((r) => r.ok);
    if (!anyExternalOk) {
      const levels = await loadDbFallback(mode, tier, false);
      return NextResponse.json(
        { success: true, levels, source: 'database-fallback' },
        { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } }
      );
    }

    const dbLevels = await prisma.level.findMany({
      where: {
        isChallenge: false,
        ...(mode !== 'ALL' ? { mode: mode as LevelMode } : {}),
      },
      select: dbLevelSelect,
    });

    const dbByGd = new Map(
      dbLevels.map((l) => [
        l.gdLevelId,
        {
          id: l.id,
          gdLevelId: l.gdLevelId,
          difficulty: l.difficulty,
          difficultyFace: l.difficultyFace,
          ratingType: l.ratingType,
          isVN: l.isVN,
          isChallenge: l.isChallenge,
          description: l.description,
          victorCount: l._count.records,
          youtubeId: l.youtubeId,
        },
      ])
    );

    let levels = externalResults.flatMap((r) =>
      r.ok ? mergeExternalWithDb(r.list, dbByGd) : []
    );

    for (const r of externalResults) {
      if (r.ok) continue;
      const dbOnly = await loadDbFallback(r.mode, null, false);
      levels = [...levels, ...dbOnly];
    }

    const seen = new Set(levels.map((l) => l.gdLevelId));
    for (const row of mapDbLevels(dbLevels)) {
      if (!seen.has(row.gdLevelId)) {
        seen.add(row.gdLevelId);
        levels.push(row);
      }
    }

    if (tier === 'main') levels = levels.filter((l) => l.placement != null && l.placement >= 1 && l.placement <= 75);
    else if (tier === 'extended') levels = levels.filter((l) => l.placement != null && l.placement >= 75 && l.placement <= 150);
    else if (tier === 'legacy') levels = levels.filter((l) => isLegacyTier(l.placement));

    levels.sort((a, b) => {
      const am = String(a.mode);
      const bm = String(b.mode);
      if (am !== bm) return am === 'CLASSIC' ? -1 : 1;
      return compareListLevels(a, b);
    });

    for (const r of externalResults) {
      if (!r.ok) continue;
      void syncExternalListToDb(r.mode).catch((err) => console.error(`sync ${r.mode}`, err));
    }

    return NextResponse.json(
      { success: true, levels, source: 'external' },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (error: any) {
    try {
      const { searchParams } = new URL(req.url);
      const mode = searchParams.get('mode') || 'CLASSIC';
      const tier = searchParams.get('tier');
      const levels = await loadDbFallback(mode, tier, searchParams.get('challenge') === '1');
      return NextResponse.json(
        { success: true, levels, source: 'database-fallback', warning: error.message },
        { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } }
      );
    } catch {
      return NextResponse.json({ error: error.message || 'Lỗi truy xuất Levels List.' }, { status: 500 });
    }
  }
}
