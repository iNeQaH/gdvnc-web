import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { awardedPpForProgress, calculatePlayerPp } from '@/lib/ScoringEngine';

export const RECORD_SCORING_LEVEL_SELECT = {
  id: true,
  gdLevelId: true,
  name: true,
  mode: true,
  minPercent: true,
  basePp: true,
  placement: true,
  isChallenge: true,
} as const;

const recordLevelInclude = { level: { select: RECORD_SCORING_LEVEL_SELECT } } as const;

type RecordLike = {
  progress: number | null;
  timeMs: number | null;
  submittedAt: Date;
};

type RecordWithLevel = RecordLike & {
  id: string;
  userId: string | null;
  legacyPlayerName?: string | null;
  levelId: string;
  videoUrl?: string;
  hz?: number | null;
  device?: string | null;
  level: {
    mode: LevelMode;
    minPercent: number;
    basePp: number;
    placement: number | null;
    name: string;
    isChallenge?: boolean;
    gdLevelId?: number;
  };
};

export type HardestLevel = {
  id?: string;
  name: string;
  placement: number | null;
  gdLevelId: number;
};

function collectModeAwardedPp(
  records: Array<{
    progress: number | null;
    timeMs: number | null;
    submittedAt: Date;
    levelId: string;
    level: {
      mode: LevelMode;
      minPercent: number;
      basePp: number;
      isChallenge?: boolean;
      placement?: number | null;
    };
  }>,
  mode: LevelMode
): { ranked: number[]; unranked: number[] } {
  const deduped = dedupeRecordsByLevel(records as RecordWithLevel[]).filter(
    (r) => !r.level.isChallenge && r.level.mode === mode
  );
  const ranked: number[] = [];
  const unranked: number[] = [];

  for (const rec of deduped) {
    const pp =
      mode === LevelMode.PLATFORMER
        ? isQualifyingPlatformerRecord(rec)
          ? rec.level.basePp
          : 0
        : isQualifyingClassicRecord(rec, rec.level)
          ? awardedPpForProgress(rec.progress, rec.level.minPercent, rec.level.basePp)
          : 0;
    if (pp <= 0) continue;
    if (rec.level.placement != null) ranked.push(pp);
    else unranked.push(pp);
  }

  return { ranked, unranked };
}

export function calculateModePp(
  records: Array<{
    progress: number | null;
    timeMs: number | null;
    submittedAt: Date;
    levelId: string;
    level: {
      mode: LevelMode;
      minPercent: number;
      basePp: number;
      isChallenge?: boolean;
      placement?: number | null;
    };
  }>,
  mode: LevelMode
): number {
  const { ranked, unranked } = collectModeAwardedPp(records, mode);
  return calculatePlayerPp(ranked, unranked);
}

export function pickHardestLevel(
  records: Array<{
    progress: number | null;
    timeMs: number | null;
    level: {
      id?: string;
      mode: LevelMode;
      minPercent: number;
      placement: number | null;
      name: string;
      gdLevelId?: number | null;
      isChallenge?: boolean;
    };
  }>
): HardestLevel | null {
  const qualifying = records.filter((r) => {
    if (r.level.isChallenge) return false;
    if (r.level.mode === LevelMode.PLATFORMER) return isQualifyingPlatformerRecord(r);
    return isQualifyingClassicRecord(r, r.level);
  });

  const ranked = qualifying.filter((r) => r.level.placement != null);
  const pool = ranked.length > 0 ? ranked : qualifying;
  if (pool.length === 0) return null;

  pool.sort((a, b) => (a.level.placement ?? 999999) - (b.level.placement ?? 999999));
  const level = pool[0].level;
  return {
    id: level.id,
    name: level.name,
    placement: level.placement,
    gdLevelId: level.gdLevelId ?? 0,
  };
}

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
    const key = rec.userId || `legacy:${(rec.legacyPlayerName || '').trim().toLowerCase() || rec.id}`;
    const existing = byUser.get(key);
    if (!existing || isRecordBetter(rec, existing, rec.level.mode)) {
      byUser.set(key, rec);
    }
  }
  return Array.from(byUser.values());
}

export async function recalculateUserPp(userId: string | null | undefined, tx: any = prisma) {
  if (!userId) return;
  const db = tx || prisma;

  const userRecords = await db.record.findMany({
    where: { userId, status: RecordStatus.APPROVED },
    include: recordLevelInclude,
  });

  const deduped = dedupeRecordsByLevel(userRecords);

  const classic = collectModeAwardedPp(deduped, LevelMode.CLASSIC);
  const platformer = collectModeAwardedPp(deduped, LevelMode.PLATFORMER);

  const classicHardest = pickHardestLevel(deduped.filter((r: any) => r.level.mode === LevelMode.CLASSIC));
  const platformerHardest = pickHardestLevel(deduped.filter((r: any) => r.level.mode === LevelMode.PLATFORMER));

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        classicPp: calculatePlayerPp(classic.ranked, classic.unranked),
        platformerPp: calculatePlayerPp(platformer.ranked, platformer.unranked),
        hardestClassicLevelId: classicHardest?.id || null,
        hardestPlatformerLevelId: platformerHardest?.id || null,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      console.warn(`recalculateUserPp: User ${userId} not found in database.`);
      return;
    }
    throw error;
  }

  try {
    const { bustPublicCache, CACHE_TAGS } = await import('@/lib/publicCache');
    bustPublicCache(CACHE_TAGS.leaderboard, CACHE_TAGS.highlights);
  } catch {}
}

export async function recalculateAllUsersPp() {
  const users = await prisma.user.findMany({
    where: { records: { some: { status: RecordStatus.APPROVED } } },
    select: { id: true },
  });
  for (let i = 0; i < users.length; i += 5) {
    const chunk = users.slice(i, i + 5);
    await Promise.all(chunk.map((user) => recalculateUserPp(user.id)));
  }
  return users.length;
}

export async function consolidateBeforeApprove(
  recordId: string,
  tx: any = prisma
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = tx || prisma;
  const record = await db.record.findUnique({
    where: { id: recordId },
    include: recordLevelInclude,
  });

  if (!record) {
    return { ok: false, reason: 'Không tìm thấy kỷ lục.' };
  }

  if (!record.userId) {
    return { ok: true };
  }

  const siblings = await db.record.findMany({
    where: {
      userId: record.userId,
      levelId: record.levelId,
      id: { not: recordId },
      status: { in: [RecordStatus.APPROVED, RecordStatus.PENDING] },
    },
  });

  const approvedOld = siblings.filter((s: any) => s.status === RecordStatus.APPROVED);
  for (const old of approvedOld) {
    if (!isRecordBetter(record, old, record.level.mode)) {
      return {
        ok: false,
        reason: 'Người chơi đã có kỷ lục tốt hơn hoặc bằng được phê duyệt trước đó.',
      };
    }
  }

  if (approvedOld.length > 0) {
    await db.record.updateMany({
      where: { id: { in: approvedOld.map((s: any) => s.id) } },
      data: {
        status: RecordStatus.REJECTED,
        rejectReason: 'Thay thế bởi kỷ lục tốt hơn.',
        reviewedAt: new Date(),
      },
    });
  }

  const pendingIds = siblings.filter((s: any) => s.status === RecordStatus.PENDING).map((s: any) => s.id);
  if (pendingIds.length > 0) {
    await db.record.updateMany({
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
