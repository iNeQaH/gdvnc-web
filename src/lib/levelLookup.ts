import { notFound, permanentRedirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAllDigitsId, UUID_RE } from '@/lib/levelUrl';
import { RecordStatus } from '@prisma/client';
import { dedupeRecordsByUser } from '@/lib/recordUtils';

const levelInclude = {
  records: {
    where: { status: RecordStatus.APPROVED },
    include: { user: true },
    orderBy: [
      { timeMs: 'asc' as const },
      { progress: 'desc' as const },
      { submittedAt: 'asc' as const },
    ],
  },
};

export async function resolvePublicLevel(id: string) {
  if (isAllDigitsId(id)) {
    const level = await prisma.level.findUnique({
      where: { gdLevelId: Number(id) },
      include: levelInclude,
    });
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
