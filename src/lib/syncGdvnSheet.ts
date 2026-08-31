import { LevelMode } from '@prisma/client';
import prisma from '@/lib/prisma';
import { clipText } from '@/lib/validate';
import {
  fetchGdvnSheetRows,
  gdvnSheetSourceKey,
  type GdvnSheetRow,
} from '@/lib/gdvnSheet';

const CREATE_CHUNK = 80;
const UPDATE_CHUNK = 40;

export type GdvnSheetSyncResult = {
  fetched: number;
  levelsCreated: number;
  levelsUpdated: number;
  timelineCreated: number;
  timelineUpdated: number;
  timelineSkipped: number;
};

function sameDay(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

async function chunked<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

function levelChanged(cur: {
  name: string;
  creatorName: string | null;
  difficulty: string;
  difficultyFace: number;
  ratingType: string;
  isVN: boolean;
}, row: GdvnSheetRow) {
  return (
    !cur.isVN ||
    cur.name !== row.name ||
    (cur.creatorName || '') !== row.creatorName ||
    cur.difficulty !== row.difficulty ||
    cur.difficultyFace !== row.difficultyFace ||
    cur.ratingType !== row.ratingType
  );
}

export async function syncGdvnSheet(): Promise<GdvnSheetSyncResult> {
  const rows = await fetchGdvnSheetRows();
  const ids = rows.map((r) => r.gdLevelId);

  const existingLevels = await prisma.level.findMany({
    where: { gdLevelId: { in: ids } },
    select: {
      id: true,
      gdLevelId: true,
      name: true,
      creatorName: true,
      difficulty: true,
      difficultyFace: true,
      ratingType: true,
      isVN: true,
    },
  });
  const levelByGd = new Map(existingLevels.map((l) => [l.gdLevelId, l]));

  const toCreateLevels: GdvnSheetRow[] = [];
  const toUpdateLevels: Array<{ id: string; row: GdvnSheetRow }> = [];
  for (const row of rows) {
    const cur = levelByGd.get(row.gdLevelId);
    if (!cur) toCreateLevels.push(row);
    else if (levelChanged(cur, row)) toUpdateLevels.push({ id: cur.id, row });
  }

  let levelsCreated = 0;
  await chunked(toCreateLevels, CREATE_CHUNK, async (chunk) => {
    const result = await prisma.level.createMany({
      data: chunk.map((row) => ({
        gdLevelId: row.gdLevelId,
        name: clipText(row.name, 160),
        creatorName: clipText(row.creatorName, 80),
        difficulty: clipText(row.difficulty, 40),
        difficultyFace: row.difficultyFace,
        ratingType: row.ratingType,
        isVN: true,
        isChallenge: false,
        placement: null,
        basePp: 0,
        minPercent: 100,
        mode: LevelMode.CLASSIC,
      })),
      skipDuplicates: true,
    });
    levelsCreated += result.count;
  });

  let levelsUpdated = 0;
  await chunked(toUpdateLevels, UPDATE_CHUNK, async (chunk) => {
    await Promise.all(
      chunk.map(({ id, row }) =>
        prisma.level.update({
          where: { id },
          data: {
            name: clipText(row.name, 160),
            creatorName: clipText(row.creatorName, 80),
            difficulty: clipText(row.difficulty, 40),
            difficultyFace: row.difficultyFace,
            ratingType: row.ratingType,
            isVN: true,
          },
        })
      )
    );
    levelsUpdated += chunk.length;
  });

  const dated = rows.filter((r) => r.ratedAt);
  const sourceKeys = dated.map((r) => gdvnSheetSourceKey(r.gdLevelId));
  const existingEvents = sourceKeys.length
    ? await prisma.timelineEvent.findMany({
        where: { sourceKey: { in: sourceKeys } },
        select: {
          id: true,
          sourceKey: true,
          title: true,
          shortDescription: true,
          startAt: true,
          endAt: true,
          tier: true,
        },
      })
    : [];
  const eventByKey = new Map(existingEvents.map((e) => [e.sourceKey!, e]));

  const toCreateEvents: GdvnSheetRow[] = [];
  const toUpdateEvents: Array<{ id: string; row: GdvnSheetRow }> = [];
  for (const row of dated) {
    const key = gdvnSheetSourceKey(row.gdLevelId);
    const cur = eventByKey.get(key);
    const title = clipText(row.name, 160);
    const shortDescription = clipText(row.creatorName, 80);
    if (!cur) {
      toCreateEvents.push(row);
      continue;
    }
    if (
      cur.title !== title ||
      cur.shortDescription !== shortDescription ||
      cur.tier !== row.timelineTier ||
      !sameDay(cur.startAt, row.ratedAt!) ||
      !sameDay(cur.endAt, row.ratedAt!)
    ) {
      toUpdateEvents.push({ id: cur.id, row });
    }
  }

  let timelineCreated = 0;
  await chunked(toCreateEvents, CREATE_CHUNK, async (chunk) => {
    const result = await prisma.timelineEvent.createMany({
      data: chunk.map((row) => ({
        sourceKey: gdvnSheetSourceKey(row.gdLevelId),
        title: clipText(row.name, 160),
        shortDescription: clipText(row.creatorName, 80),
        fullDescription: clipText(`ID ${row.gdLevelId}`, 200),
        startAt: row.ratedAt!,
        endAt: row.ratedAt!,
        approximate: false,
        nature: 'negative',
        tier: row.timelineTier,
      })),
      skipDuplicates: true,
    });
    timelineCreated += result.count;
  });

  let timelineUpdated = 0;
  await chunked(toUpdateEvents, UPDATE_CHUNK, async (chunk) => {
    await Promise.all(
      chunk.map(({ id, row }) =>
        prisma.timelineEvent.update({
          where: { id },
          data: {
            title: clipText(row.name, 160),
            shortDescription: clipText(row.creatorName, 80),
            fullDescription: clipText(`ID ${row.gdLevelId}`, 200),
            startAt: row.ratedAt!,
            endAt: row.ratedAt!,
            tier: row.timelineTier,
          },
        })
      )
    );
    timelineUpdated += chunk.length;
  });

  return {
    fetched: rows.length,
    levelsCreated,
    levelsUpdated,
    timelineCreated,
    timelineUpdated,
    timelineSkipped: rows.length - dated.length,
  };
}
