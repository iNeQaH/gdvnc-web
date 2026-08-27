import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { isRecordBetter, recalculateUserPp } from '@/lib/recordUtils';

export async function claimLegacyRecords(userId: string, gdUsername: string | null | undefined) {
  const name = gdUsername?.trim();
  if (!name) return { claimed: 0 };

  const orphans = await prisma.record.findMany({
    where: {
      userId: null,
      legacyPlayerName: { equals: name, mode: 'insensitive' },
      status: RecordStatus.APPROVED,
    },
    include: { level: true },
  });

  let claimed = 0;

  for (const rec of orphans) {
    const siblings = await prisma.record.findMany({
      where: {
        userId,
        levelId: rec.levelId,
        id: { not: rec.id },
        status: { in: [RecordStatus.APPROVED, RecordStatus.PENDING] },
      },
      include: { level: true },
    });

    const betterOrEqual = siblings.find(
      (s) => s.status === RecordStatus.APPROVED && !isRecordBetter(rec, s, rec.level.mode)
    );

    if (betterOrEqual) {
      await prisma.record.update({
        where: { id: rec.id },
        data: {
          userId,
          legacyPlayerName: null,
          status: RecordStatus.REJECTED,
          rejectReason: 'Đã có kỷ lục tốt hơn trên tài khoản sau khi xác minh.',
          reviewedAt: new Date(),
        },
      });
      continue;
    }

    for (const old of siblings.filter((s) => s.status === RecordStatus.APPROVED)) {
      if (isRecordBetter(rec, old, rec.level.mode)) {
        await prisma.record.update({
          where: { id: old.id },
          data: {
            status: RecordStatus.REJECTED,
            rejectReason: 'Thay thế bởi kỷ lục cũ đã xác minh.',
            reviewedAt: new Date(),
          },
        });
      }
    }

    const pendingIds = siblings.filter((s) => s.status === RecordStatus.PENDING).map((s) => s.id);
    if (pendingIds.length > 0) {
      await prisma.record.updateMany({
        where: { id: { in: pendingIds } },
        data: {
          status: RecordStatus.REJECTED,
          rejectReason: 'Đã gắn kỷ lục cũ đã xác minh cho màn chơi này.',
          reviewedAt: new Date(),
        },
      });
    }

    await prisma.record.update({
      where: { id: rec.id },
      data: { userId, legacyPlayerName: null },
    });
    claimed++;
  }

  await recalculateUserPp(userId);
  return { claimed };
}
