import { LevelMode } from '@prisma/client';
import prisma from '@/lib/prisma';
import { clipText } from '@/lib/validate';
import { fetchGdBrowser } from '@/lib/upsertLevel';
import { fetchGdvnSheetRows, type GdvnSheetRow } from '@/lib/gdvnSheet';
import { gdlisthubItemMaps, isMissingLevelText } from '@/lib/gdlisthubLists';
import { parseYoutubeVideoField } from '@/lib/timeline/glow';
import { purgeSheetTimelineEvents } from '@/lib/timeline/purgeSheetEvents';

const CREATE_CHUNK = 80;
const UPDATE_CHUNK = 40;
const EPIC_PLUS = new Set(['EPIC', 'LEGENDARY', 'MYTHIC']);
const GDB_FETCH_CAP = 24;

export type GdvnSheetSyncResult = {
  fetched: number;
  levelsCreated: number;
  levelsUpdated: number;
  timelineCreated: number;
  timelineUpdated: number;
  timelineSkipped: number;
  timelinePurged: number;
  usersUnverified: number;
  creatorsQueued: number;
};

async function chunked<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

async function resolveEpicYoutubeIds(rows: GdvnSheetRow[]) {
  const epicIds = rows.filter((r) => EPIC_PLUS.has(r.ratingType)).map((r) => r.gdLevelId);
  const byGd = new Map<number, string>();
  if (!epicIds.length) return byGd;

  const levels = await prisma.level.findMany({
    where: { gdLevelId: { in: epicIds } },
    select: { id: true, gdLevelId: true, youtubeId: true },
  });
  for (const level of levels) {
    if (level.youtubeId) byGd.set(level.gdLevelId, level.youtubeId);
  }

  const missing = levels.filter((l) => !l.youtubeId).slice(0, GDB_FETCH_CAP);
  await chunked(missing, 6, async (chunk) => {
    await Promise.all(
      chunk.map(async (level) => {
        const gdb = await fetchGdBrowser(level.gdLevelId);
        const yt = parseYoutubeVideoField(gdb?.video) || parseYoutubeVideoField(gdb?.youtube);
        if (!yt) return;
        await prisma.level.update({ where: { id: level.id }, data: { youtubeId: yt } });
        byGd.set(level.gdLevelId, yt);
      })
    );
  });

  return byGd;
}

function creatorNameForRow(row: GdvnSheetRow) {
  if (!isMissingLevelText(row.creatorName)) return row.creatorName;
  const maps = gdlisthubItemMaps();
  return (
    maps.featured.get(row.gdLevelId)?.creator ||
    maps.classic.get(row.gdLevelId)?.creator ||
    row.creatorName
  );
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
    (cur.creatorName || '') !== creatorNameForRow(row) ||
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
      description: true,
      youtubeId: true,
      mode: true,
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
        creatorName: clipText(creatorNameForRow(row), 80),
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
            creatorName: clipText(creatorNameForRow(row), 80),
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

  await resolveEpicYoutubeIds(rows);

  const timelinePurged = await purgeSheetTimelineEvents();

  const unverified = await prisma.user.updateMany({
    data: { gdVerified: false },
  });

  const creatorNames = [...new Set(rows.map((r) => r.creatorName.trim()).filter(Boolean))];

  return {
    fetched: rows.length,
    levelsCreated,
    levelsUpdated,
    timelineCreated: 0,
    timelineUpdated: 0,
    timelineSkipped: 0,
    timelinePurged,
    usersUnverified: unverified.count,
    creatorsQueued: creatorNames.length,
  };
}
