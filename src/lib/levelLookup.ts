import { notFound, permanentRedirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAllDigitsId, UUID_RE } from '@/lib/levelUrl';
import { LevelMode, RecordStatus } from '@prisma/client';
import { dedupeRecordsByUser } from '@/lib/recordUtils';
import { calculateBasePp } from '@/lib/ScoringEngine';
import { findExternalLevel } from '@/lib/externalLists';
import { formatDifficultyLabel, mapDifficultyFace } from '@/lib/gdDifficulty';
import { fetchGdBrowser, preferMinPercent, preferText, preferYoutubeId } from '@/lib/upsertLevel';

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

async function ensureLevelFromExternal(gdLevelId: number) {
  const ext = await findExternalLevel(gdLevelId);
  if (!ext) return null;
  const levelMode = ext.mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
  const gdb = await fetchGdBrowser(gdLevelId);
  const difficulty = gdb?.difficulty ? String(gdb.difficulty) : 'Demon';
  const difficultyFace = gdb?.difficulty ? mapDifficultyFace(gdb.difficulty) : 0;

  return prisma.level.upsert({
    where: { gdLevelId },
    create: {
      gdLevelId: ext.gdLevelId,
      name: ext.name,
      mode: levelMode,
      difficulty,
      difficultyFace,
      placement: ext.placement,
      basePp: calculateBasePp(ext.placement),
      minPercent: ext.minPercent,
      creatorName: ext.creatorName,
      verifierName: ext.verifierName,
      youtubeId: ext.youtubeId,
      description: ext.description,
      isChallenge: false,
    },
    update: {
      placement: ext.placement,
      basePp: calculateBasePp(ext.placement),
    },
    include: levelInclude,
  });
}

export async function resolvePublicLevel(id: string) {
  if (isAllDigitsId(id)) {
    const gdLevelId = Number(id);
    let level = await prisma.level.findUnique({
      where: { gdLevelId },
      include: levelInclude,
    });
    if (!level) {
      level = await ensureLevelFromExternal(gdLevelId);
    } else if (!level.isChallenge) {
      const ext = await findExternalLevel(gdLevelId).catch(() => null);
      if (ext) {
        const hadYoutube = Boolean(level.youtubeId);
        const nextYoutube = preferYoutubeId(ext.youtubeId, level.youtubeId);
        level = {
          ...level,
          name: ext.name,
          placement: ext.placement,
          basePp: calculateBasePp(ext.placement),
          minPercent: preferMinPercent(ext.minPercent, level.minPercent),
          creatorName: preferText(ext.creatorName, level.creatorName),
          verifierName: preferText(ext.verifierName, level.verifierName),
          youtubeId: nextYoutube,
        };
        void prisma.level
          .update({
            where: { id: level.id },
            data: {
              placement: ext.placement,
              basePp: calculateBasePp(ext.placement),
              ...(!hadYoutube && nextYoutube ? { youtubeId: nextYoutube } : {}),
            },
          })
          .catch(() => {});
      }
    }
    if (!level) notFound();
    return refreshDifficultyFromGd(level);
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
