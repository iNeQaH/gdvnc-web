import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { clearLeaderboardCache } from '@/lib/leaderboard';

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const player = String(name || '').trim();
    if (!player) {
      return NextResponse.json({ error: 'Thiếu tên người chơi.' }, { status: 400 });
    }

    const result = await prisma.record.deleteMany({
      where: {
        userId: null,
        status: RecordStatus.APPROVED,
        legacyPlayerName: { equals: player, mode: 'insensitive' },
      },
    });

    clearLeaderboardCache();
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xoá người chơi cũ.' }, { status: 500 });
  }
}
