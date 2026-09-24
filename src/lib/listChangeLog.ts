import prisma from '@/lib/prisma';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export type ChangeLogEvent =
  | 'LEVEL_ADDED'
  | 'LEVEL_REMOVED'
  | 'LEVEL_MOVED'
  | 'LEVEL_DROPPED'
  | 'RATING_UPDATED';

export type ChangeLogItem = {
  id?: string;
  list: 'DEMON' | 'PEMON';
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
 * Format concise, beautiful human-readable description for change log entries
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
  oldRating?: string | null;
  newRating?: string | null;
}): string {
  const {
    eventType,
    newPlacement,
    oldPlacement,
    aboveLevelName,
    belowLevelName,
    pushedOutLevelName,
    causedByLevelName,
    causedByPlacement,
    oldRating,
    newRating,
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

    case 'LEVEL_MOVED': {
      if (oldPlacement && newPlacement) {
        const diff = oldPlacement - newPlacement; // positive = moved up, negative = moved down
        const changeStr =
          diff > 0 ? `▲ ${diff} bậc` : diff < 0 ? `▼ ${Math.abs(diff)} bậc` : 'giữ nguyên';
        return `#${oldPlacement} → #${newPlacement} (${changeStr})`;
      }
      return `Thay đổi vị trí xếp hạng`;
    }

    case 'LEVEL_DROPPED': {
      if (oldPlacement) {
        return `Bị gỡ khỏi danh sách (trước đó #${oldPlacement})`;
      }
      return `Bị gỡ khỏi danh sách`;
    }

    case 'RATING_UPDATED': {
      const o = oldRating || 'None';
      const n = newRating || 'None';
      return `Rating: ${o} → ${n}`;
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

    // Insert safely using raw SQL query (compatible with both current and generated prisma client)
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
 * Compare old list state with new list state and generate change logs
 */
export async function diffAndLogListChanges(
  list: 'DEMON' | 'PEMON',
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

  // Find levels previously in top 150 that got pushed out (placement > 150 or null)
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
  // If 1 level is pushed out and 1 level added:
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

  // 2. Check for levels moved within top 150
  for (const l of newRanked) {
    const old = oldByGd.get(l.gdLevelId);
    if (old && old.placement != null && old.placement >= 1 && old.placement <= 150) {
      if (old.placement !== l.placement) {
        logs.push({
          list,
          eventType: 'LEVEL_MOVED',
          gdLevelId: l.gdLevelId,
          levelName: l.name,
          oldPlacement: old.placement,
          newPlacement: l.placement,
        });
      }

      // Check rating changes
      if (old.ratingType && l.ratingType && old.ratingType !== l.ratingType && l.ratingType !== 'NONE') {
        logs.push({
          list,
          eventType: 'RATING_UPDATED',
          gdLevelId: l.gdLevelId,
          levelName: l.name,
          oldPlacement: l.placement,
          newPlacement: l.placement,
          oldRating: old.ratingType,
          newRating: l.ratingType,
        });
      }
    }
  }

  // 3. Check for dropped levels (placement set to null from DB)
  for (const old of oldLevels) {
    if (old.placement != null && old.placement >= 1 && old.placement <= 150) {
      const nowInAll = newLevels.find((n) => n.gdLevelId === old.gdLevelId);
      if (!nowInAll || nowInAll.placement == null) {
        // Only log if not already logged in pushedOutLevels
        const alreadyPushed = pushedOutLevels.some((p) => p.gdLevelId === old.gdLevelId);
        if (!alreadyPushed) {
          logs.push({
            list,
            eventType: 'LEVEL_DROPPED',
            gdLevelId: old.gdLevelId,
            levelName: old.name,
            oldPlacement: old.placement,
            newPlacement: null,
          });
        }
      }
    }
  }

  if (logs.length > 0) {
    return await recordChangeLogs(logs);
  }
  return 0;
}
