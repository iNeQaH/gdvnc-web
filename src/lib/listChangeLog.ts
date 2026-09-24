import prisma from '@/lib/prisma';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export type ChangeLogEvent = 'LEVEL_ADDED' | 'LEVEL_REMOVED';

export type ChangeLogListType = 'DEMON' | 'PEMON' | 'CHALLENGE';

export type ChangeLogItem = {
  id?: string;
  list: ChangeLogListType;
  eventType: ChangeLogEvent;
  gdLevelId: number;
  levelName: string;
  oldPlacement?: number | null;
  newPlacement?: number | null;
  aboveLevelName?: string | null;
  belowLevelName?: string | null;
  pushedOutLevelName?: string | null;
  causedByLevelName?: string | null;
  causedByPlacement?: number | null;
  oldRating?: string | null;
  newRating?: string | null;
  details?: string | null;
  createdAt?: Date;
};

/**
 * Format concise, human-readable description for change log entries
 * ONLY for LEVEL_ADDED and LEVEL_REMOVED
 */
export function formatChangeLogDetails(item: {
  eventType: ChangeLogEvent;
  levelName: string;
  newPlacement?: number | null;
  oldPlacement?: number | null;
  aboveLevelName?: string | null;
  belowLevelName?: string | null;
  pushedOutLevelName?: string | null;
  causedByLevelName?: string | null;
  causedByPlacement?: number | null;
}): string {
  const {
    eventType,
    newPlacement,
    aboveLevelName,
    belowLevelName,
    pushedOutLevelName,
    causedByLevelName,
    causedByPlacement,
  } = item;

  switch (eventType) {
    case 'LEVEL_ADDED': {
      const pos = newPlacement ?? 0;
      let context = '';

      if (pos === 1) {
        // Top 1: ignore above level
        if (belowLevelName) {
          context = ` (trên ${belowLevelName} #2)`;
        }
      } else if (pos >= 150) {
        // Top 150: ignore below level
        if (aboveLevelName) {
          context = ` (dưới ${aboveLevelName} #${pos - 1})`;
        }
      } else {
        // In between: show both
        const aboveText = aboveLevelName ? `dưới ${aboveLevelName} #${pos - 1}` : '';
        const belowText = belowLevelName ? `trên ${belowLevelName} #${pos + 1}` : '';
        if (aboveText && belowText) {
          context = ` (${aboveText}, ${belowText})`;
        } else if (aboveText) {
          context = ` (${aboveText})`;
        } else if (belowText) {
          context = ` (${belowText})`;
        }
      }

      const pushedText = pushedOutLevelName
        ? ` — đẩy ${pushedOutLevelName} khỏi top 150`
        : '';

      return `Thêm vào #${pos}${context}${pushedText}`;
    }

    case 'LEVEL_REMOVED': {
      if (causedByLevelName && causedByPlacement) {
        return `Bị đẩy khỏi top 150 (bởi ${causedByLevelName} #${causedByPlacement})`;
      }
      return `Bị đẩy khỏi top 150`;
    }

    default:
      return '';
  }
}

/**
 * Record a batch of change log entries into the database.
 */
export async function recordChangeLogs(entries: ChangeLogItem[]): Promise<number> {
  if (!entries || entries.length === 0) return 0;

  try {
    for (const e of entries) {
      if (!e.details) {
        e.details = formatChangeLogDetails(e);
      }
    }

    // Insert safely using raw SQL query
    for (let i = 0; i < entries.length; i += 50) {
      const chunk = entries.slice(i, i + 50);
      await Promise.all(
        chunk.map((item) =>
          prisma.$executeRaw`
            INSERT INTO "ListChangeLog" (
              "id", "list", "eventType", "gdLevelId", "levelName",
              "oldPlacement", "newPlacement", "aboveLevelName", "belowLevelName",
              "pushedOutLevelName", "causedByLevelName", "causedByPlacement",
              "oldRating", "newRating", "details", "createdAt"
            ) VALUES (
              gen_random_uuid(), ${item.list}, ${item.eventType}, ${item.gdLevelId}, ${item.levelName},
              ${item.oldPlacement ?? null}, ${item.newPlacement ?? null},
              ${item.aboveLevelName ?? null}, ${item.belowLevelName ?? null},
              ${item.pushedOutLevelName ?? null}, ${item.causedByLevelName ?? null}, ${item.causedByPlacement ?? null},
              ${item.oldRating ?? null}, ${item.newRating ?? null},
              ${item.details ?? null}, CURRENT_TIMESTAMP
            )
          `
        )
      );
    }

    bustPublicCache(CACHE_TAGS.levels);
    return entries.length;
  } catch (err) {
    console.error('Failed to record list change logs:', err);
    return 0;
  }
}

export type LevelSnapshot = {
  gdLevelId: number;
  name: string;
  placement: number | null;
  ratingType?: string | null;
  difficultyFace?: number | null;
};

/**
 * Compare old list state with new list state and generate change logs.
 * ONLY records:
 * 1) LEVEL_ADDED: Level mới thêm vào top 150 (kèm vị trí trên/dưới và level bị đẩy ra nếu có).
 * 2) LEVEL_REMOVED: Level bị đẩy ra khỏi top 150 (bởi level mới nào).
 * Các level khác dù bị dịch chuyển vị trí (LEVEL_MOVED) sẽ KHÔNG ghi vào log theo yêu cầu.
 */
export async function diffAndLogListChanges(
  list: ChangeLogListType,
  oldLevels: LevelSnapshot[],
  newLevels: LevelSnapshot[]
): Promise<number> {
  const oldByGd = new Map<number, LevelSnapshot>();
  for (const l of oldLevels) {
    oldByGd.set(l.gdLevelId, l);
  }

  // Filter new levels in top 150
  const newRanked = newLevels
    .filter((l) => l.placement != null && l.placement >= 1 && l.placement <= 150)
    .sort((a, b) => (a.placement ?? 999) - (b.placement ?? 999));

  const newByPlacement = new Map<number, LevelSnapshot>();
  const newByGd = new Map<number, LevelSnapshot>();
  for (const l of newRanked) {
    newByPlacement.set(l.placement!, l);
    newByGd.set(l.gdLevelId, l);
  }

  const logs: ChangeLogItem[] = [];

  // Find levels previously in top 150 that got pushed out (new placement > 150 or null)
  const pushedOutLevels: LevelSnapshot[] = [];
  for (const old of oldLevels) {
    if (old.placement != null && old.placement >= 1 && old.placement <= 150) {
      const now = newByGd.get(old.gdLevelId);
      if (!now) {
        pushedOutLevels.push(old);
      }
    }
  }

  // 1. Check for newly added levels in top 150
  const newlyAdded: Array<{
    level: LevelSnapshot;
    pos: number;
    aboveName: string | null;
    belowName: string | null;
  }> = [];

  for (const l of newRanked) {
    const pos = l.placement!;
    const old = oldByGd.get(l.gdLevelId);
    const wasInTop150 = old && old.placement != null && old.placement >= 1 && old.placement <= 150;

    if (!wasInTop150) {
      // Level is newly added to top 150!
      const above = pos > 1 ? newByPlacement.get(pos - 1)?.name || null : null;
      const below = pos < 150 ? newByPlacement.get(pos + 1)?.name || null : null;

      newlyAdded.push({
        level: l,
        pos,
        aboveName: above,
        belowName: below,
      });
    }
  }

  // Correlate pushed out levels with newly added levels
  let pushedOutIndex = 0;
  for (const added of newlyAdded) {
    const pushed = pushedOutLevels[pushedOutIndex];
    if (pushed) pushedOutIndex++;

    logs.push({
      list,
      eventType: 'LEVEL_ADDED',
      gdLevelId: added.level.gdLevelId,
      levelName: added.level.name,
      oldPlacement: oldByGd.get(added.level.gdLevelId)?.placement ?? null,
      newPlacement: added.pos,
      aboveLevelName: added.aboveName,
      belowLevelName: added.belowName,
      pushedOutLevelName: pushed ? pushed.name : null,
    });
  }

  // For any pushed out level: log LEVEL_REMOVED
  for (let i = 0; i < pushedOutLevels.length; i++) {
    const pushed = pushedOutLevels[i];
    const causingAdded = newlyAdded[i] || newlyAdded[0];

    logs.push({
      list,
      eventType: 'LEVEL_REMOVED',
      gdLevelId: pushed.gdLevelId,
      levelName: pushed.name,
      oldPlacement: pushed.placement,
      newPlacement: null,
      causedByLevelName: causingAdded ? causingAdded.level.name : null,
      causedByPlacement: causingAdded ? causingAdded.pos : null,
    });
  }

  // NOTE: LEVEL_MOVED, RATING_UPDATED, LEVEL_DROPPED are intentionally omitted as per requirement.

  if (logs.length > 0) {
    return await recordChangeLogs(logs);
  }
  return 0;
}
