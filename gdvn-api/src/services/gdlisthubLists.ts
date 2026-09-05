import featuredPack from '@/services/data/gdlisthub-fl.json';
import classicPack from '@/services/data/gdlisthub-dl.json';

function youtubeId(value?: string | null) {
  const raw = String(value || '').trim();
  return /^[\w-]{11}$/.test(raw) ? raw : null;
}

export function isMissingLevelText(value?: string | null) {
  const s = String(value ?? '').trim();
  return !s || /^unknown(?: level)?$/i.test(s);
}

export function hubYoutubeId(value?: string | null) {
  return youtubeId(value);
}

export type GdlisthubListItem = {
  position: number;
  gdLevelId: number;
  name: string | null;
  creator: string | null;
  videoID: string | null;
  difficulty: string | null;
  isPlatformer: boolean;
  isChallenge: boolean;
};

export type GdlisthubListPack = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  updated_at?: string;
  items: GdlisthubListItem[];
};

export const GDLISTHUB_FEATURED = featuredPack as GdlisthubListPack;
export const GDLISTHUB_CLASSIC = classicPack as GdlisthubListPack;

const GDLISTHUB_API = 'https://api.gdlisthub.dev/lists';

function packFromApi(data: any, fallback: GdlisthubListPack): GdlisthubListPack {
  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) return fallback;
  return {
    id: Number(data.id) || fallback.id,
    slug: String(data.slug || fallback.slug),
    title: String(data.title || fallback.title),
    description: data.description ?? fallback.description,
    updated_at: data.updated_at,
    items: items
      .slice()
      .sort((a: any, b: any) => (a.position || 9999) - (b.position || 9999))
      .map((it: any) => ({
        position: Number(it.position) || 0,
        gdLevelId: Number(it.levelId),
        name: it.level?.name || null,
        creator: it.level?.creator || null,
        videoID: it.videoID || it.level?.videoID || null,
        difficulty: it.level?.difficulty || null,
        isPlatformer: Boolean(it.level?.isPlatformer),
        isChallenge: Boolean(it.level?.isChallenge),
      }))
      .filter((it: GdlisthubListItem) => Number.isFinite(it.gdLevelId) && it.gdLevelId > 0 && it.position > 0),
  };
}

export async function fetchGdlisthubPack(slug: 'fl' | 'dl'): Promise<GdlisthubListPack> {
  const fallback = slug === 'fl' ? GDLISTHUB_FEATURED : GDLISTHUB_CLASSIC;
  try {
    const res = await fetch(`${GDLISTHUB_API}/${slug}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return packFromApi(await res.json(), fallback);
  } catch {
    return fallback;
  }
}

export function gdlisthubItemMaps(featured = GDLISTHUB_FEATURED, classic = GDLISTHUB_CLASSIC) {
  return {
    featured: new Map(featured.items.map((item) => [item.gdLevelId, item])),
    classic: new Map(classic.items.map((item) => [item.gdLevelId, item])),
  };
}

function virtualFromGdlisthub(
  gdLevelId: number,
  featured?: GdlisthubListItem,
  classic?: GdlisthubListItem
) {
  const src = featured || classic;
  return {
    id: `gdlh:${gdLevelId}`,
    gdLevelId,
    name: src?.name || 'Unknown Level',
    creatorName: src?.creator || 'Unknown',
    youtubeId: youtubeId(src?.videoID),
    mode: src?.isPlatformer ? 'PLATFORMER' : 'CLASSIC',
    difficulty: src?.difficulty || 'Unrated',
    difficultyFace: 0,
    ratingType: 'NONE',
    isVN: Boolean(featured),
    isChallenge: Boolean(src?.isChallenge),
    placement: null,
    vnPlacement: featured?.position ?? null,
    classicPlacement: classic?.position ?? null,
    basePp: 0,
    minPercent: 100,
    description: null,
    victorCount: 0,
  };
}

export function applyGdlisthubRanksToLevels(
  levels: Array<Record<string, any>>,
  featured = GDLISTHUB_FEATURED,
  classic = GDLISTHUB_CLASSIC
) {
  const maps = gdlisthubItemMaps(featured, classic);
  const seen = new Set<number>();
  const next: Array<Record<string, any>> = levels.map((level) => {
    seen.add(Number(level.gdLevelId));
    const fl = maps.featured.get(Number(level.gdLevelId));
    const dl = maps.classic.get(Number(level.gdLevelId));
    const src = fl || dl;
    return {
      ...level,
      isVN: Boolean(level.isVN) || Boolean(fl),
      vnPlacement: fl?.position ?? level.vnPlacement ?? null,
      classicPlacement: dl?.position ?? null,
      name: isMissingLevelText(level.name) && src?.name ? src.name : level.name,
      creatorName:
        isMissingLevelText(level.creatorName) && src?.creator ? src.creator : level.creatorName,
      youtubeId: level.youtubeId || youtubeId(src?.videoID),
    };
  });
  for (const gdLevelId of new Set([...maps.featured.keys(), ...maps.classic.keys()])) {
    if (seen.has(gdLevelId)) continue;
    next.push(virtualFromGdlisthub(gdLevelId, maps.featured.get(gdLevelId), maps.classic.get(gdLevelId)));
  }
  return next;
}
