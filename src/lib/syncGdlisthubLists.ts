import prisma from '@/lib/prisma';
import { LevelMode } from '@prisma/client';
import {
  fetchGdlisthubPack,
  GDLISTHUB_CLASSIC,
  GDLISTHUB_FEATURED,
  type GdlisthubListItem,
} from '@/lib/gdlisthubLists';
import { extractYoutubeId, preferText, preferYoutubeId } from '@/lib/upsertLevel';

function stubData(item: GdlisthubListItem, isVN: boolean, vnPlacement: number | null) {
  return {
    gdLevelId: item.gdLevelId,
    name: item.name || 'Unknown Level',
    creatorName: item.creator || 'Unknown',
    mode: item.isPlatformer ? LevelMode.PLATFORMER : LevelMode.CLASSIC,
    difficulty: item.difficulty || 'Unrated',
    difficultyFace: 0,
    ratingType: 'NONE',
    isVN,
    isChallenge: Boolean(item.isChallenge),
    placement: null as number | null,
    vnPlacement,
    basePp: 0,
    minPercent: 100,
    youtubeId: extractYoutubeId(item.videoID),
  };
}

async function ensureLevels(items: GdlisthubListItem[]) {
  const ids = items.map((item) => item.gdLevelId);
  const existing = await prisma.level.findMany({
    where: { gdLevelId: { in: ids } },
    select: { gdLevelId: true },
  });
  const have = new Set(existing.map((row) => row.gdLevelId));
  const toCreate = items.filter((item) => !have.has(item.gdLevelId)).map((item) => stubData(item, false, null));
  if (toCreate.length > 0) {
    await prisma.level.createMany({ data: toCreate, skipDuplicates: true });
  }
  return { created: toCreate.length, existing: have.size };
}

export async function syncGdlisthubLists() {
  const featured = await fetchGdlisthubPack('fl');
  const classic = await fetchGdlisthubPack('dl');
  const featuredItems = featured.items.length > 0 ? featured.items : GDLISTHUB_FEATURED.items;
  const classicItems = classic.items.length > 0 ? classic.items : GDLISTHUB_CLASSIC.items;

  const classicEnsured = await ensureLevels(classicItems);
  const featuredEnsured = await ensureLevels(featuredItems);

  const featuredIds = featuredItems.map((item) => item.gdLevelId);
  await prisma.level.updateMany({
    where: { isVN: true, isChallenge: false, gdLevelId: { notIn: featuredIds } },
    data: { vnPlacement: null },
  });

  let featuredUpdated = 0;
  for (const item of featuredItems) {
    const row = await prisma.level.findUnique({
      where: { gdLevelId: item.gdLevelId },
      select: { name: true, creatorName: true, youtubeId: true },
    });
    if (!row) continue;
    await prisma.level.update({
      where: { gdLevelId: item.gdLevelId },
      data: {
        isVN: true,
        isChallenge: false,
        vnPlacement: item.position,
        name: preferText(item.name, row.name) || row.name,
        creatorName: preferText(item.creator, row.creatorName),
        youtubeId: preferYoutubeId(extractYoutubeId(item.videoID), row.youtubeId),
      },
    });
    featuredUpdated += 1;
  }

  return {
    featuredCount: featuredItems.length,
    classicCount: classicItems.length,
    classicCreated: classicEnsured.created,
    featuredCreated: featuredEnsured.created,
    featuredUpdated,
    source: featured.items.length > 0 ? 'live' : 'snapshot',
  };
}
