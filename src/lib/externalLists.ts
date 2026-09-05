import { LevelMode } from '@prisma/client';
import prisma from '@/lib/prisma';
import { calculateBasePp } from '@/lib/ScoringEngine';
import { extractYoutubeId, preferMinPercent, preferText, preferYoutubeId } from '@/lib/upsertLevel';
import { loadListSnapshot, persistLocalListSnapshot } from '@/lib/listSnapshot';
import classicMedia from '@/lib/data/pointercrateClassicMedia.json';

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

const CACHE_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 25_000;
const cache: Record<string, CacheEntry> = {};

const AREDL_CLASSIC = 'https://api.aredl.net/v2/api/aredl/levels';
const AREDL_PLAT = 'https://api.aredl.net/v2/api/arepl/levels';

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent':
          'Mozilla/5.0 (compatible; GDVNC/1.0; +https://gdvnc-web.vercel.app) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://pointercrate.com/',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error(`API từ chối yêu cầu (HTTP 403) cho ${url}`);
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPointercrateListed(): Promise<ExternalListLevel[]> {
  const all: ExternalListLevel[] = [];
  let after = 0;
  // Official list is large; stop once we have enough ranked entries for our PP curve.
  const maxPlacement = 500;
  for (let page = 0; page < 8; page++) {
    const data = await fetchJson(
      `https://pointercrate.com/api/v2/demons/listed/?limit=100&after=${after}`
    );
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
        minPercent: Number.isFinite(Number(demon.requirement)) ? Number(demon.requirement) : 100,
        mode: 'CLASSIC',
        description: null,
      });
    }
    const lastPos = Number(data[data.length - 1]?.position);
    if (!Number.isFinite(lastPos) || lastPos >= maxPlacement) break;
    after = lastPos;
  }
  return all;
}

async function fetchPemonlist(): Promise<ExternalListLevel[]> {
  const data = await fetchJson('https://pemonlist.com/api/list?limit=1000');
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

function mapAredlRows(data: unknown, mode: 'CLASSIC' | 'PLATFORMER'): ExternalListLevel[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { levels?: unknown })?.levels)
      ? (data as { levels: unknown[] }).levels
      : [];
  const all: ExternalListLevel[] = [];
  for (const raw of rows) {
    const demon = raw as Record<string, unknown>;
    const gdLevelId = Number(demon.level_id);
    if (!Number.isFinite(gdLevelId) || gdLevelId <= 0) continue;
    const placement = Number(demon.position);
    if (!Number.isFinite(placement) || placement < 1) continue;
    const videoRaw =
      (typeof demon.video === 'string' && demon.video) ||
      (typeof demon.video_url === 'string' && demon.video_url) ||
      (typeof demon.verification_video === 'string' && demon.verification_video) ||
      null;
    all.push({
      gdLevelId,
      name: String(demon.name || `Level ${gdLevelId}`),
      placement,
      creatorName: null,
      verifierName: null,
      youtubeId: extractYoutubeId(videoRaw),
      minPercent: 100,
      mode,
      description: typeof demon.description === 'string' ? demon.description : null,
    });
  }
  return all;
}

async function fetchAredl(mode: 'CLASSIC' | 'PLATFORMER'): Promise<ExternalListLevel[]> {
  const url = mode === 'PLATFORMER' ? AREDL_PLAT : AREDL_CLASSIC;
  return mapAredlRows(await fetchJson(url), mode);
}

async function fetchClassicListed(): Promise<ExternalListLevel[]> {
  try {
    const listed = await fetchPointercrateListed();
    if (listed.length >= 10) return applyClassicMedia(listed);
  } catch (error) {
    console.warn('Pointercrate classic failed, falling back to AREDL + snapshot', error);
  }
  return applyClassicMedia(await fetchAredl('CLASSIC'));
}

async function fetchPlatformerListed(): Promise<ExternalListLevel[]> {
  try {
    const listed = await fetchPemonlist();
    if (listed.length >= 10) return listed;
  } catch (error) {
    console.error('Pemonlist failed, falling back to AREDL', error);
  }
  return fetchAredl('PLATFORMER');
}

type ClassicMedia = { youtubeId: string | null; minPercent: number };

function applyClassicMedia(levels: ExternalListLevel[]): ExternalListLevel[] {
  const table = classicMedia as Record<string, ClassicMedia>;
  return levels.map((level) => {
    const extra = table[String(level.gdLevelId)];
    if (!extra) return level;
    return {
      ...level,
      youtubeId: level.youtubeId || extra.youtubeId,
      minPercent: preferMinPercent(extra.minPercent, level.minPercent),
    };
  });
}

export function clearExternalListCache(mode?: 'CLASSIC' | 'PLATFORMER') {
  if (mode) delete cache[mode];
  else {
    delete cache.CLASSIC;
    delete cache.PLATFORMER;
  }
}

export async function getExternalList(
  mode: 'CLASSIC' | 'PLATFORMER',
  opts?: { force?: boolean }
): Promise<ExternalListLevel[]> {
  const cached = cache[mode];
  if (!opts?.force && cached && Date.now() - cached.at < CACHE_MS) return cached.levels;

  const levels = mode === 'CLASSIC' ? await fetchClassicListed() : await fetchPlatformerListed();
  if (levels.length === 0) {
    throw new Error(`Empty ${mode} list from upstream`);
  }
  cache[mode] = { at: Date.now(), levels };
  return levels;
}

export async function findExternalLevel(gdLevelId: number): Promise<ExternalListLevel | null> {
  const row = await prisma.level.findUnique({
    where: { gdLevelId },
    select: {
      gdLevelId: true,
      name: true,
      placement: true,
      creatorName: true,
      verifierName: true,
      youtubeId: true,
      minPercent: true,
      mode: true,
      description: true,
      isChallenge: true,
    },
  });
  if (!row || row.isChallenge || row.placement == null) return null;
  return {
    gdLevelId: row.gdLevelId,
    name: row.name,
    placement: row.placement,
    creatorName: row.creatorName,
    verifierName: row.verifierName,
    youtubeId: row.youtubeId,
    minPercent: row.minPercent,
    mode: row.mode === LevelMode.PLATFORMER ? 'PLATFORMER' : 'CLASSIC',
    description: row.description,
  };
}

async function applyListedLevelsToDb(mode: 'CLASSIC' | 'PLATFORMER', external: ExternalListLevel[]) {
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
  const affectedIds: string[] = [];
  const toCreate: Array<{
    gdLevelId: number;
    name: string;
    mode: typeof levelMode;
    difficulty: string;
    difficultyFace: number;
    placement: number;
    basePp: number;
    minPercent: number;
    creatorName: string | null;
    verifierName: string | null;
    youtubeId: string | null;
    description: string | null;
    isChallenge: boolean;
  }> = [];
  const toUpdate: Array<{ id: string; placement: number; basePp: number; youtubeId?: string; minPercent?: number }> = [];

  for (const row of external) {
    seen.add(row.gdLevelId);
    const basePp = calculateBasePp(row.placement);
    const cur = byGd.get(row.gdLevelId);
    if (!cur) {
      toCreate.push({
        gdLevelId: row.gdLevelId,
        name: row.name,
        mode: levelMode,
        difficulty: 'Demon',
        difficultyFace: 0,
        placement: row.placement,
        basePp,
        minPercent: row.minPercent,
        creatorName: row.creatorName,
        verifierName: row.verifierName,
        youtubeId: row.youtubeId,
        description: row.description,
        isChallenge: false,
      });
      continue;
    }

    const nextYoutube = preferYoutubeId(row.youtubeId, cur.youtubeId);
    const nextMin = preferMinPercent(row.minPercent, cur.minPercent);
    const needsUpdate =
      cur.placement !== row.placement ||
      Math.abs(cur.basePp - basePp) > 0.01 ||
      cur.youtubeId !== nextYoutube ||
      cur.minPercent !== nextMin;

    if (needsUpdate) {
      toUpdate.push({
        id: cur.id,
        placement: row.placement,
        basePp,
        ...(nextYoutube && nextYoutube !== cur.youtubeId ? { youtubeId: nextYoutube } : {}),
        ...(nextMin !== cur.minPercent ? { minPercent: nextMin } : {}),
      });
      affectedIds.push(cur.id);
    }
  }

  let created = 0;
  let updated = 0;

  for (let i = 0; i < toCreate.length; i += 100) {
    const chunk = toCreate.slice(i, i + 100);
    const result = await prisma.level.createMany({ data: chunk, skipDuplicates: true });
    created += result.count;
  }
  if (toCreate.length) {
    const createdRows = await prisma.level.findMany({
      where: { gdLevelId: { in: toCreate.map((r) => r.gdLevelId) } },
      select: { id: true, gdLevelId: true },
    });
    for (const row of createdRows) {
      if (!byGd.has(row.gdLevelId)) affectedIds.push(row.id);
      byGd.set(row.gdLevelId, row as (typeof existing)[number]);
    }
  }

  for (let i = 0; i < toUpdate.length; i += 50) {
    const chunk = toUpdate.slice(i, i + 50);
    await Promise.all(
      chunk.map((u) =>
        prisma.level.update({
          where: { id: u.id },
          data: {
            placement: u.placement,
            basePp: u.basePp,
            ...(u.youtubeId ? { youtubeId: u.youtubeId } : {}),
            ...(u.minPercent != null ? { minPercent: u.minPercent } : {}),
          },
        })
      )
    );
    updated += chunk.length;
  }

  const staleIds = existing.filter((l) => l.placement != null && !seen.has(l.gdLevelId)).map((l) => l.id);
  if (staleIds.length > 0) {
    await prisma.level.updateMany({
      where: { id: { in: staleIds } },
      data: { placement: null, basePp: 0 },
    });
    affectedIds.push(...staleIds);
  }

  return {
    mode,
    synced: external.length,
    created,
    updated,
    stale: staleIds.length,
    affectedIds,
  };
}

/** Sync rank from Pointercrate / Pemonlist. Only placement/PP on update; fill empty youtubeId; create new levels. */
export async function syncExternalListToDb(
  mode: 'CLASSIC' | 'PLATFORMER',
  opts?: { force?: boolean }
) {
  let external: ExternalListLevel[] = [];
  let source: 'upstream' | 'uploadthing' = 'upstream';

  try {
    external = await getExternalList(mode, opts);
  } catch (error) {
    const ranked = await prisma.level.count({
      where: {
        mode: mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC,
        isChallenge: false,
        placement: { not: null },
      },
    });
    if (ranked >= 10) throw error;
    const snapshot = await loadListSnapshot(mode);
    if (!snapshot || snapshot.length < 10) throw error;
    console.warn(`${mode} upstream failed; restoring ${snapshot.length} levels from UploadThing snapshot`);
    external = snapshot;
    source = 'uploadthing';
  }

  if (external.length < 10) {
    throw new Error(`Refusing sync for ${mode}: only ${external.length} upstream levels`);
  }

  const result = await applyListedLevelsToDb(mode, external);
  const snapshot =
    source === 'upstream'
      ? await persistLocalListSnapshot(mode).catch((err) => {
          console.error(`Failed to persist ${mode} list snapshot`, err);
          return null;
        })
      : null;

  return {
    ...result,
    source,
    snapshotCount: snapshot?.count ?? result.synced,
  };
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
      youtubeId?: string | null;
      minPercent?: number | null;
      creatorName?: string | null;
      vnPlacement?: number | null;
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
      difficulty: local?.difficulty || 'Demon',
      difficultyFace: local?.difficultyFace ?? 0,
      ratingType: local?.ratingType || 'NONE',
      isVN: local?.isVN || false,
      isChallenge: false,
      placement: ext.placement,
      vnPlacement: local?.vnPlacement ?? null,
      basePp: calculateBasePp(ext.placement),
      minPercent: preferMinPercent(ext.minPercent, local?.minPercent),
      creatorName: preferText(ext.creatorName, local?.creatorName),
      youtubeId: preferYoutubeId(ext.youtubeId, local?.youtubeId),
      description: local?.description ?? ext.description,
      victorCount: local?.victorCount || 0,
    };
  });
}
