import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { placeholderVideoWhere, isPlaceholderRecordVideo } from '@/lib/placeholderRecordVideo';
import { recalculateUserPp } from '@/lib/recordUtils';
import { clearLeaderboardCache } from '@/lib/leaderboard';

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const candidates = await prisma.record.findMany({
      where: placeholderVideoWhere(),
      select: { id: true, userId: true, videoUrl: true },
    });
    const ids = candidates.filter((r) => isPlaceholderRecordVideo(r.videoUrl)).map((r) => r.id);
    const userIds = [
      ...new Set(candidates.filter((r) => ids.includes(r.id) && r.userId).map((r) => r.userId as string)),
    ];

    if (ids.length > 0) {
      await prisma.record.deleteMany({ where: { id: { in: ids } } });
      await Promise.all(userIds.map((id) => recalculateUserPp(id)));
    }

    clearLeaderboardCache();
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi dọn kỷ lục giả.' }, { status: 500 });
  }
}
