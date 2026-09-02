import { notFound, permanentRedirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAllDigitsId, UUID_RE } from '@/lib/levelUrl';
import { RecordStatus } from '@prisma/client';
import { dedupeRecordsByUser } from '@/lib/recordUtils';
import { formatDifficultyLabel, mapDifficultyFace, pickGdCreatorName } from '@/lib/gdDifficulty';
import { fetchGdBrowser, getOrCreateStubLevel } from '@/lib/upsertLevel';
import { gdlisthubItemMaps, hubYoutubeId, isMissingLevelText } from '@/lib/gdlisthubLists';

const levelInclude = {
  records: {
    where: { status: RecordStatus.APPROVED },
    include: {
      user: {
        select: { id: true, username: true, gdUsername: true, avatarUrl: true, classicPp: true, platformerPp: true, gdVerified: true },
      },
    },
    orderBy: [
      { timeMs: 'asc' as const },
      { progress: 'desc' as const },
      { submittedAt: 'asc' as const },
    ],
  },
};

function needsDifficultyRefresh(level: { difficulty: string; difficultyFace: number }) {
  if (level.difficultyFace === 0) return true;
  if (level.difficulty === 'Extreme Demon' && level.difficultyFace !== 14) return true;
  if (level.difficulty === 'Demon') return true;
  return false;
}

async function refreshDifficultyFromGd<T extends { id: string; gdLevelId: number; difficulty: string; difficultyFace: number }>(
  level: T
): Promise<T> {
  if (!needsDifficultyRefresh(level)) return level;
  const gdb = await fetchGdBrowser(level.gdLevelId);
  if (!gdb?.difficulty) {
    // At least align text with stored face when GD is unavailable
    if (level.difficultyFace > 0) {
      const label = formatDifficultyLabel(level.difficultyFace, level.difficulty);
      if (label !== level.difficulty) {
        void prisma.level.update({ where: { id: level.id }, data: { difficulty: label } }).catch(() => {});
        return { ...level, difficulty: label };
      }
    }
    return level;
  }
  const difficultyFace = mapDifficultyFace(gdb.difficulty);
  const difficulty = String(gdb.difficulty);
  void prisma.level
    .update({
      where: { id: level.id },
      data: { difficulty, difficultyFace },
    })
    .catch(() => {});
  return { ...level, difficulty, difficultyFace };
}

async function fillMissingCreatorFromHub<
  T extends { id: string; gdLevelId: number; name: string; creatorName: string | null; youtubeId: string | null },
>(level: T): Promise<T> {
  const needCreator = isMissingLevelText(level.creatorName);
  const needName = isMissingLevelText(level.name);
  const needVideo = !level.youtubeId;
  if (!needCreator && !needName && !needVideo) return level;

  const maps = gdlisthubItemMaps();
  const item = maps.featured.get(level.gdLevelId) || maps.classic.get(level.gdLevelId);
  const patch: { name?: string; creatorName?: string; youtubeId?: string } = {};
  if (needName && item?.name) patch.name = item.name;
  if (needCreator && item?.creator) patch.creatorName = item.creator;
  const yt = hubYoutubeId(item?.videoID);
  if (needVideo && yt) patch.youtubeId = yt;

  if (needCreator && !patch.creatorName) {
    const gdb = await fetchGdBrowser(level.gdLevelId);
    const fromGd = pickGdCreatorName(gdb);
    if (fromGd) patch.creatorName = fromGd;
    const gdName = gdb ? String(gdb.name || '').trim() : '';
    if (needName && !patch.name && gdName) patch.name = gdName;
  }

  if (!Object.keys(patch).length) return level;
  void prisma.level.update({ where: { id: level.id }, data: patch }).catch(() => {});
  return { ...level, ...patch };
}

export async function resolvePublicLevel(id: string) {
  if (isAllDigitsId(id)) {
    const gdLevelId = Number(id);
    let level = await prisma.level.findUnique({
      where: { gdLevelId },
      include: levelInclude,
    });
    if (!level) {
      const maps = gdlisthubItemMaps();
      const item = maps.featured.get(gdLevelId) || maps.classic.get(gdLevelId);
      if (!item) notFound();
      await getOrCreateStubLevel({
        gdLevelId,
        name: item.name || undefined,
        creatorName: item.creator || undefined,
        isPlatformer: item.isPlatformer,
      });
      if (item === maps.featured.get(gdLevelId)) {
        await prisma.level.update({
          where: { gdLevelId },
          data: {
            isVN: true,
            vnPlacement: item.position,
            youtubeId: item.videoID && /^[\w-]{11}$/.test(item.videoID) ? item.videoID : undefined,
          },
        });
      } else if (item.videoID && /^[\w-]{11}$/.test(item.videoID)) {
        await prisma.level.update({
          where: { gdLevelId },
          data: { youtubeId: item.videoID },
        });
      }
      level = await prisma.level.findUnique({
        where: { gdLevelId },
        include: levelInclude,
      });
    }
    if (!level) notFound();
    return refreshDifficultyFromGd(await fillMissingCreatorFromHub(level));
  }

  if (UUID_RE.test(id)) {
    const level = await prisma.level.findUnique({
      where: { id },
      select: { gdLevelId: true },
    });
    if (!level) notFound();
    permanentRedirect(`/levels/${level.gdLevelId}`);
  }

  notFound();
}

export function victorCountForLevel(level: {
  mode: any;
  minPercent: number;
  basePp: number;
  placement: number | null;
  name: string;
  records: any[];
}) {
  return dedupeRecordsByUser(
    level.records.map((r) => ({
      ...r,
      level: {
        mode: level.mode,
        minPercent: level.minPercent,
        basePp: level.basePp,
        placement: level.placement,
        name: level.name,
      },
    }))
  ).length;
}
