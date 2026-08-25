import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { calculateTotalPp } from '@/lib/ScoringEngine';

type RecordLike = {
  progress: number | null;
  timeMs: number | null;
  submittedAt: Date;
};

type RecordWithLevel = RecordLike & {
  id: string;
  userId: string;
  levelId: string;
  videoUrl: string;
  hz?: number | null;
  device?: string | null;
  level: {
    mode: LevelMode;
    minPercent: number;
    basePp: number;
    placement: number | null;
    name: string;
  };
};

export function isQualifyingClassicRecord(
  record: { progress: number | null },
  level: { minPercent: number }
) {
  return (record.progress ?? 0) >= level.minPercent;
}

export function isQualifyingPlatformerRecord(record: { timeMs: number | null }) {
  return record.timeMs !== null;
}

export function isRecordBetter(a: RecordLike, b: RecordLike, mode: LevelMode): boolean {
  if (mode === LevelMode.PLATFORMER) {
    if (a.timeMs == null) return false;
    if (b.timeMs == null) return true;
    if (a.timeMs !== b.timeMs) return a.timeMs < b.timeMs;
    return a.submittedAt > b.submittedAt;
  }

  const ap = a.progress ?? 0;
  const bp = b.progress ?? 0;
  if (ap !== bp) return ap > bp;
  return a.submittedAt > b.submittedAt;
}

export function dedupeRecordsByLevel<T extends RecordWithLevel>(records: T[]): T[] {
  const byLevel = new Map<string, T>();
  for (const rec of records) {
    const existing = byLevel.get(rec.levelId);
    if (!existing || isRecordBetter(rec, existing, rec.level.mode)) {
      byLevel.set(rec.levelId, rec);
    }
  }
  return Array.from(byLevel.values());
}

export function dedupeRecordsByUser<T extends RecordWithLevel>(records: T[]): T[] {
  const byUser = new Map<string, T>();
  for (const rec of records) {
    const existing = byUser.get(rec.userId);
    if (!existing || isRecordBetter(rec, existing, rec.level.mode)) {
      byUser.set(rec.userId, rec);
    }
  }
  return Array.from(byUser.values());
}

export async function recalculateUserPp(userId: string) {
  const userRecords = await prisma.record.findMany({
    where: { userId, status: RecordStatus.APPROVED },
    include: { level: true },
  });

  const deduped = dedupeRecordsByLevel(userRecords);

  const classicBasePps = deduped
    .filter((r) => r.level.mode === LevelMode.CLASSIC && isQualifyingClassicRecord(r, r.level))
    .map((r) => r.level.basePp);

  const platformerBasePps = deduped
    .filter((r) => r.level.mode === LevelMode.PLATFORMER && isQualifyingPlatformerRecord(r))
    .map((r) => r.level.basePp);

  await prisma.user.update({
    where: { id: userId },
    data: {
      classicPp: calculateTotalPp(classicBasePps),
      platformerPp: calculateTotalPp(platformerBasePps),
    },
  });
}

export async function consolidateBeforeApprove(recordId: string): Promise<
  | { ok: true }
  | { ok: false; reason: string }
> {
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: { level: true },
  });

  if (!record) {
    return { ok: false, reason: 'Không tìm thấy kỷ lục.' };
  }

  const siblings = await prisma.record.findMany({
    where: {
      userId: record.userId,
      levelId: record.levelId,
      id: { not: recordId },
      status: { in: [RecordStatus.APPROVED, RecordStatus.PENDING] },
    },
  });

    for (const old of siblings.filter((s) => s.status === RecordStatus.APPROVED)) {
    if (!isRecordBetter(record, old, record.level.mode)) {
      return {
        ok: false,
        reason: 'Người chơi đã có kỷ lục tốt hơn hoặc bằng được phê duyệt trước đó.',
      };
    }
    await prisma.record.update({
      where: { id: old.id },
      data: {
        status: RecordStatus.REJECTED,
        rejectReason: 'Thay thế bởi kỷ lục tốt hơn.',
        reviewedAt: new Date(),
      },
    });
  }

  const pendingIds = siblings.filter((s) => s.status === RecordStatus.PENDING).map((s) => s.id);
  if (pendingIds.length > 0) {
    await prisma.record.updateMany({
      where: { id: { in: pendingIds } },
      data: {
        status: RecordStatus.REJECTED,
        rejectReason: 'Đã duyệt kỷ lục khác cho màn chơi này.',
        reviewedAt: new Date(),
      },
    });
  }

  return { ok: true };
}
