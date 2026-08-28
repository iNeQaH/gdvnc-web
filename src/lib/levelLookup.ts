import { notFound, permanentRedirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAllDigitsId, UUID_RE } from '@/lib/levelUrl';
import { LevelMode, RecordStatus } from '@prisma/client';
import { dedupeRecordsByUser } from '@/lib/recordUtils';
import { calculateBasePp } from '@/lib/ScoringEngine';
import { findExternalLevel } from '@/lib/externalLists';

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

async function ensureLevelFromExternal(gdLevelId: number) {
  const ext = await findExternalLevel(gdLevelId);
  if (!ext) return null;
  const levelMode = ext.mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
  return prisma.level.upsert({
    where: { gdLevelId },
    create: {
      gdLevelId: ext.gdLevelId,
      name: ext.name,
      mode: levelMode,
      difficulty: 'Extreme Demon',
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
      name: ext.name,
      placement: ext.placement,
      basePp: calculateBasePp(ext.placement),
      minPercent: ext.minPercent,
      creatorName: ext.creatorName,
      verifierName: ext.verifierName,
      youtubeId: ext.youtubeId,
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
        const patched = {
          ...level,
          name: ext.name,
          placement: ext.placement,
          basePp: calculateBasePp(ext.placement),
          minPercent: ext.minPercent,
          creatorName: ext.creatorName ?? level.creatorName,
          verifierName: ext.verifierName ?? level.verifierName,
          youtubeId: ext.youtubeId ?? level.youtubeId,
        };
        void prisma.level
          .update({
            where: { id: level.id },
            data: {
              name: ext.name,
              placement: ext.placement,
              basePp: calculateBasePp(ext.placement),
              minPercent: ext.minPercent,
              creatorName: ext.creatorName,
              verifierName: ext.verifierName,
              youtubeId: ext.youtubeId,
            },
          })
          .catch(() => {});
        return patched;
      }
    }
    if (!level) notFound();
    return level;
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
