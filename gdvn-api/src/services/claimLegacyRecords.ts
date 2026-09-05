import prisma from '../db';
import { RecordStatus } from '@prisma/client';
import { isRecordBetter, recalculateUserPp } from './recordUtils';

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

  const rejectedLegacyIds: string[] = [];
  const rejectedOldIds: string[] = [];
  const rejectedPendingIds: string[] = [];
  const updatedLegacyIds: string[] = [];

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
      rejectedLegacyIds.push(rec.id);
      continue;
    }

    for (const old of siblings.filter((s) => s.status === RecordStatus.APPROVED)) {
      if (isRecordBetter(rec, old, rec.level.mode)) {
        rejectedOldIds.push(old.id);
      }
    }

    const pendingIds = siblings.filter((s) => s.status === RecordStatus.PENDING).map((s) => s.id);
    rejectedPendingIds.push(...pendingIds);

    updatedLegacyIds.push(rec.id);
  }

  if (rejectedLegacyIds.length > 0) {
    await prisma.record.updateMany({
      where: { id: { in: rejectedLegacyIds } },
      data: {
        userId,
        legacyPlayerName: null,
        status: RecordStatus.REJECTED,
        rejectReason: 'Đã có kỷ lục tốt hơn trên tài khoản sau khi xác minh.',
        reviewedAt: new Date(),
      },
    });
  }

  if (rejectedOldIds.length > 0) {
    await prisma.record.updateMany({
      where: { id: { in: rejectedOldIds } },
      data: {
        status: RecordStatus.REJECTED,
        rejectReason: 'Thay thế bởi kỷ lục cũ đã xác minh.',
        reviewedAt: new Date(),
      },
    });
  }

  if (rejectedPendingIds.length > 0) {
    await prisma.record.updateMany({
      where: { id: { in: rejectedPendingIds } },
      data: {
        status: RecordStatus.REJECTED,
        rejectReason: 'Đã gán kỷ lục cũ đã xác minh cho màn chơi này.',
        reviewedAt: new Date(),
      },
    });
  }

  if (updatedLegacyIds.length > 0) {
    await prisma.record.updateMany({
      where: { id: { in: updatedLegacyIds } },
      data: { userId, legacyPlayerName: null },
    });
  }

  if (updatedLegacyIds.length > 0) {
    await recalculateUserPp(userId);
  }

  return { claimed: updatedLegacyIds.length };
}
