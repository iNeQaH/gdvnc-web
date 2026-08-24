import React from 'react';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import DemonDetailView from '@/components/DemonDetailView';
import { dedupeRecordsByUser } from '@/lib/recordUtils';

export default async function DemonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const level = await prisma.level.findUnique({
    where: { id },
    include: {
      records: {
        where: { status: 'APPROVED' },
        include: { user: true },
        orderBy: [
          { timeMs: 'asc' },
          { progress: 'desc' },
          { submittedAt: 'asc' }
        ]
      }
    }
  });

  if (!level) return notFound();

  const victors = dedupeRecordsByUser(
    level.records.map((r) => ({ ...r, level: { mode: level.mode, minPercent: level.minPercent, basePp: level.basePp, placement: level.placement, name: level.name } }))
  ).sort((a, b) => {
    if (level.mode === 'PLATFORMER') {
      return (a.timeMs ?? Infinity) - (b.timeMs ?? Infinity);
    }
    const progDiff = (b.progress ?? 0) - (a.progress ?? 0);
    if (progDiff !== 0) return progDiff;
    return a.submittedAt.getTime() - b.submittedAt.getTime();
  });

  const levelWithVictors = { ...level, records: victors };

  const neighborSelect = { id: true, name: true, placement: true };
  const modeFilter = { mode: level.mode, placement: { not: null } };

  const [prevLevel, nextLevel, firstLevel, lastLevel] = await Promise.all([
    level.placement != null
      ? prisma.level.findFirst({
          where: { mode: level.mode, placement: { lt: level.placement } },
          orderBy: { placement: 'desc' },
          select: neighborSelect,
        })
      : null,
    level.placement != null
      ? prisma.level.findFirst({
          where: { mode: level.mode, placement: { gt: level.placement } },
          orderBy: { placement: 'asc' },
          select: neighborSelect,
        })
      : null,
    prisma.level.findFirst({
      where: modeFilter,
      orderBy: { placement: 'asc' },
      select: neighborSelect,
    }),
    prisma.level.findFirst({
      where: modeFilter,
      orderBy: { placement: 'desc' },
      select: neighborSelect,
    }),
  ]);

  const isFirst = !prevLevel;
  const isLast = !nextLevel;

  return (
    <DemonDetailView
      level={JSON.parse(JSON.stringify(levelWithVictors))}
      prevLevel={prevLevel}
      nextLevel={nextLevel}
      firstLevel={isFirst ? null : firstLevel}
      lastLevel={isLast ? null : lastLevel}
    />
  );
}
