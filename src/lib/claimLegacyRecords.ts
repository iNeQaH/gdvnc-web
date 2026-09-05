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

  if (!orphans.length) return { claimed: 0 };

  const levelIds = [...new Set(orphans.map((r) => r.levelId))];
  const siblings = await prisma.record.findMany({
    where: {
      userId,
      levelId: { in: levelIds },
      status: { in: [RecordStatus.APPROVED, RecordStatus.PENDING] },
    },
    include: { level: true },
  });
  const siblingsByLevel = new Map<string, typeof siblings>();
  for (const rec of siblings) {
    const list = siblingsByLevel.get(rec.levelId) || [];
    list.push(rec);
    siblingsByLevel.set(rec.levelId, list);
  }

  let claimed = 0;
  await prisma.$transaction(async (tx) => {
    for (const rec of orphans) {
      const levelSiblings = (siblingsByLevel.get(rec.levelId) || []).filter((s) => s.id !== rec.id);
      const betterOrEqual = levelSiblings.find(
        (s) => s.status === RecordStatus.APPROVED && !isRecordBetter(rec, s, rec.level.mode)
      );

      if (betterOrEqual) {
        await tx.record.update({
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

      const rejectApproved = levelSiblings
        .filter((s) => s.status === RecordStatus.APPROVED && isRecordBetter(rec, s, rec.level.mode))
        .map((s) => s.id);
      if (rejectApproved.length) {
        await tx.record.updateMany({
          where: { id: { in: rejectApproved } },
          data: {
            status: RecordStatus.REJECTED,
            rejectReason: 'Thay thế bởi kỷ lục cũ đã xác minh.',
            reviewedAt: new Date(),
          },
        });
      }

      const pendingIds = levelSiblings.filter((s) => s.status === RecordStatus.PENDING).map((s) => s.id);
      if (pendingIds.length) {
        await tx.record.updateMany({
          where: { id: { in: pendingIds } },
          data: {
            status: RecordStatus.REJECTED,
            rejectReason: 'Đã gắn kỷ lục cũ đã xác minh cho màn chơi này.',
            reviewedAt: new Date(),
          },
        });
      }

      await tx.record.update({
        where: { id: rec.id },
        data: { userId, legacyPlayerName: null },
      });
      claimed++;
    }
  });

  await recalculateUserPp(userId);
  return { claimed };
}
