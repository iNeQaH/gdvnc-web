import React from 'react';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import DemonDetailView from '@/components/DemonDetailView';

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

  const neighborSelect = { id: true, name: true, placement: true };
  const [prevLevel, nextLevel] = await Promise.all([
    level.placement != null
      ? prisma.level.findFirst({
          where: { mode: level.mode, placement: { lt: level.placement } },
          orderBy: { placement: 'desc' },
          select: neighborSelect,
        })
      : prisma.level.findFirst({
          where: { mode: level.mode, placement: null, createdAt: { lt: level.createdAt } },
          orderBy: { createdAt: 'desc' },
          select: neighborSelect,
        }),
    level.placement != null
      ? prisma.level.findFirst({
          where: { mode: level.mode, placement: { gt: level.placement } },
          orderBy: { placement: 'asc' },
          select: neighborSelect,
        })
      : prisma.level.findFirst({
          where: { mode: level.mode, placement: null, createdAt: { gt: level.createdAt } },
          orderBy: { createdAt: 'asc' },
          select: neighborSelect,
        }),
  ]);

  return (
    <DemonDetailView
      level={JSON.parse(JSON.stringify(level))}
      prevLevel={prevLevel}
      nextLevel={nextLevel}
    />
  );
}
