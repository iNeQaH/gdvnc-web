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

  return <DemonDetailView level={JSON.parse(JSON.stringify(level))} />;
}
