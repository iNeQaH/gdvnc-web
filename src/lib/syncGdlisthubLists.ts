import prisma from '@/lib/prisma';
import { LevelMode } from '@prisma/client';
import {
  fetchGdlisthubPack,
  GDLISTHUB_CLASSIC,
  GDLISTHUB_FEATURED,
  isMissingLevelText,
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
    select: { id: true, gdLevelId: true, name: true, creatorName: true, youtubeId: true },
  });
  const have = new Set(existing.map((row) => row.gdLevelId));
  const toCreate = items.filter((item) => !have.has(item.gdLevelId)).map((item) => stubData(item, false, null));
  if (toCreate.length > 0) {
    await prisma.level.createMany({ data: toCreate, skipDuplicates: true });
  }

  const byGd = new Map(items.map((item) => [item.gdLevelId, item]));
  let filled = 0;
  const toFill = existing.filter((row) => {
    const item = byGd.get(row.gdLevelId);
    if (!item) return false;
    return (
      (isMissingLevelText(row.creatorName) && item.creator) ||
      (isMissingLevelText(row.name) && item.name) ||
      (!row.youtubeId && extractYoutubeId(item.videoID))
    );
  });
  const FILL_CHUNK = 40;
  for (let i = 0; i < toFill.length; i += FILL_CHUNK) {
    const chunk = toFill.slice(i, i + FILL_CHUNK);
    await Promise.all(
      chunk.map((row) => {
        const item = byGd.get(row.gdLevelId)!;
        filled += 1;
        return prisma.level.update({
          where: { id: row.id },
          data: {
            name: preferText(item.name, isMissingLevelText(row.name) ? null : row.name) || row.name,
            creatorName: preferText(item.creator, isMissingLevelText(row.creatorName) ? null : row.creatorName),
            youtubeId: preferYoutubeId(extractYoutubeId(item.videoID), row.youtubeId),
          },
        });
      })
    );
  }
  return { created: toCreate.length, existing: have.size, filled };
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
        name: preferText(item.name, isMissingLevelText(row.name) ? null : row.name) || row.name,
        creatorName: preferText(
          item.creator,
          isMissingLevelText(row.creatorName) ? null : row.creatorName
        ),
        youtubeId: preferYoutubeId(extractYoutubeId(item.videoID), row.youtubeId),
      },
    });
    featuredUpdated += 1;
  }

  return {
    featuredCount: featuredItems.length,
    classicCount: classicItems.length,
    classicCreated: classicEnsured.created,
    classicFilled: classicEnsured.filled,
    featuredCreated: featuredEnsured.created,
    featuredFilled: featuredEnsured.filled,
    featuredUpdated,
    source: featured.items.length > 0 ? 'live' : 'snapshot',
  };
}
