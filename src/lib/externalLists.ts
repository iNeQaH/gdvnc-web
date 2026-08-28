import { LevelMode } from '@prisma/client';
import prisma from '@/lib/prisma';
import { calculateBasePp } from '@/lib/ScoringEngine';
import { extractYoutubeId } from '@/lib/upsertLevel';

export type ExternalListLevel = {
  gdLevelId: number;
  name: string;
  placement: number;
  creatorName: string | null;
  verifierName: string | null;
  youtubeId: string | null;
  minPercent: number;
  mode: 'CLASSIC' | 'PLATFORMER';
  description: string | null;
};

type CacheEntry = { at: number; levels: ExternalListLevel[] };

const CACHE_MS = 5 * 60_000;
const cache: Record<string, CacheEntry> = {};

async function fetchPointercrateListed(): Promise<ExternalListLevel[]> {
  const all: ExternalListLevel[] = [];
  let after = 0;
  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `https://pointercrate.com/api/v2/demons/listed?limit=100&after=${after}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`Pointercrate HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    for (const demon of data) {
      const gdLevelId = Number(demon.level_id);
      if (!Number.isFinite(gdLevelId) || gdLevelId <= 0) continue;
      const placement = Number(demon.position);
      if (!Number.isFinite(placement) || placement < 1) continue;
      all.push({
        gdLevelId,
        name: String(demon.name || `Level ${gdLevelId}`),
        placement,
        creatorName: demon.publisher?.name || null,
        verifierName: demon.verifier?.name || null,
        youtubeId: extractYoutubeId(demon.video),
        minPercent: Number.isFinite(demon.requirement) ? Number(demon.requirement) : 100,
        mode: 'CLASSIC',
        description: null,
      });
    }
    after = data[data.length - 1].position;
  }
  return all;
}

async function fetchPemonlist(): Promise<ExternalListLevel[]> {
  const res = await fetch('https://pemonlist.com/api/list?limit=1000', {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Pemonlist HTTP ${res.status}`);
  const data = await res.json();
  const demons = Array.isArray(data?.data) ? data.data : [];
  const all: ExternalListLevel[] = [];
  for (const demon of demons) {
    const gdLevelId = Number(demon.level_id);
    if (!Number.isFinite(gdLevelId) || gdLevelId <= 0) continue;
    const placement = Number(demon.placement);
    if (!Number.isFinite(placement) || placement < 1) continue;
    const videoRaw = demon.video_id || demon.video || null;
    const youtubeId =
      videoRaw && /^[\w-]{11}$/.test(String(videoRaw))
        ? String(videoRaw)
        : extractYoutubeId(videoRaw);
    all.push({
      gdLevelId,
      name: String(demon.name || `Level ${gdLevelId}`),
      placement,
      creatorName: demon.creator || null,
      verifierName: demon.verifier?.name || null,
      youtubeId,
      minPercent: 100,
      mode: 'PLATFORMER',
      description: null,
    });
  }
  return all;
}

export async function getExternalList(mode: 'CLASSIC' | 'PLATFORMER'): Promise<ExternalListLevel[]> {
  const cached = cache[mode];
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.levels;

  const levels = mode === 'CLASSIC' ? await fetchPointercrateListed() : await fetchPemonlist();
  cache[mode] = { at: Date.now(), levels };
  return levels;
}

export async function findExternalLevel(gdLevelId: number): Promise<ExternalListLevel | null> {
  const [classic, platformer] = await Promise.all([
    getExternalList('CLASSIC').catch(() => [] as ExternalListLevel[]),
    getExternalList('PLATFORMER').catch(() => [] as ExternalListLevel[]),
  ]);
  return (
    classic.find((l) => l.gdLevelId === gdLevelId) ||
    platformer.find((l) => l.gdLevelId === gdLevelId) ||
    null
  );
}

/** Sync API list fields into DB. Keeps difficultyFace / ratingType / isVN / isChallenge / difficulty. */
export async function syncExternalListToDb(mode: 'CLASSIC' | 'PLATFORMER') {
  const external = await getExternalList(mode);
  const levelMode = mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
  const existing = await prisma.level.findMany({
    where: { isChallenge: false, mode: levelMode },
    select: {
      id: true,
      gdLevelId: true,
      placement: true,
      name: true,
      creatorName: true,
      verifierName: true,
      youtubeId: true,
      minPercent: true,
      basePp: true,
    },
  });
  const byGd = new Map(existing.map((l) => [l.gdLevelId, l]));
  const seen = new Set<number>();

  for (const row of external) {
    seen.add(row.gdLevelId);
    const basePp = calculateBasePp(row.placement);
    const cur = byGd.get(row.gdLevelId);
    if (!cur) {
      await prisma.level.create({
        data: {
          gdLevelId: row.gdLevelId,
          name: row.name,
          mode: levelMode,
          difficulty: 'Extreme Demon',
          placement: row.placement,
          basePp,
          minPercent: row.minPercent,
          creatorName: row.creatorName,
          verifierName: row.verifierName,
          youtubeId: row.youtubeId,
          description: row.description,
          isChallenge: false,
        },
      });
      continue;
    }

    const needsUpdate =
      cur.placement !== row.placement ||
      cur.name !== row.name ||
      cur.creatorName !== row.creatorName ||
      cur.verifierName !== row.verifierName ||
      cur.youtubeId !== row.youtubeId ||
      cur.minPercent !== row.minPercent ||
      Math.abs(cur.basePp - basePp) > 0.01;

    if (needsUpdate) {
      await prisma.level.update({
        where: { id: cur.id },
        data: {
          name: row.name,
          placement: row.placement,
          basePp,
          minPercent: row.minPercent,
          creatorName: row.creatorName,
          verifierName: row.verifierName,
          youtubeId: row.youtubeId,
        },
      });
    }
  }

  // Levels no longer on the external list lose placement (keep row for records/ratings)
  const staleIds = existing.filter((l) => l.placement != null && !seen.has(l.gdLevelId)).map((l) => l.id);
  if (staleIds.length > 0) {
    await prisma.level.updateMany({
      where: { id: { in: staleIds } },
      data: { placement: null, basePp: 0 },
    });
  }

  return { synced: external.length, stale: staleIds.length };
}

export function mergeExternalWithDb(
  external: ExternalListLevel[],
  dbByGd: Map<
    number,
    {
      id: string;
      gdLevelId: number;
      difficulty: string;
      difficultyFace: number;
      ratingType: string;
      isVN: boolean;
      isChallenge: boolean;
      description: string | null;
      victorCount: number;
    }
  >
) {
  return external.map((ext) => {
    const local = dbByGd.get(ext.gdLevelId);
    return {
      id: local?.id || `ext:${ext.gdLevelId}`,
      gdLevelId: ext.gdLevelId,
      name: ext.name,
      mode: ext.mode,
      difficulty: local?.difficulty || 'Extreme Demon',
      difficultyFace: local?.difficultyFace ?? 10,
      ratingType: local?.ratingType || 'NONE',
      isVN: local?.isVN || false,
      isChallenge: false,
      placement: ext.placement,
      basePp: calculateBasePp(ext.placement),
      minPercent: ext.minPercent,
      creatorName: ext.creatorName,
      youtubeId: ext.youtubeId,
      description: local?.description ?? ext.description,
      victorCount: local?.victorCount || 0,
    };
  });
}
