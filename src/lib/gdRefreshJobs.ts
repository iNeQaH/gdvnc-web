import prisma from '@/lib/prisma';
import { clipText } from '@/lib/validate';
import { fetchGdBrowser } from '@/lib/upsertLevel';
import { pickGdCreatorName, pickGdLevelName } from '@/lib/gdDifficulty';
import { SHEET_SOURCE_PREFIX } from '@/lib/timeline/sheetEvent';
import { parseYoutubeVideoField } from '@/lib/timeline/glow';
import { timelineTierForRating } from '@/lib/gdvnSheet';
import { levelChronicleHtml, levelChronicleShort } from '@/lib/timeline/levelCopy';

const CREATOR_BATCH = 16;
const TIMELINE_BATCH = 12;

export type GdRefreshPage = {
  scanned: number;
  updated: number;
  failed: number;
  skipped: number;
  done: boolean;
  nextCursor: string | null;
};

export async function refreshLevelCreatorNames(cursor?: string | null): Promise<GdRefreshPage> {
  const rows = await prisma.level.findMany({
    where: cursor ? { id: { gt: cursor } } : {},
    orderBy: { id: 'asc' },
    take: CREATOR_BATCH + 1,
    select: { id: true, gdLevelId: true, creatorName: true },
  });
  const more = rows.length > CREATOR_BATCH;
  const batch = more ? rows.slice(0, CREATOR_BATCH) : rows;

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  await Promise.all(
    batch.map(async (level) => {
      const gdb = await fetchGdBrowser(level.gdLevelId);
      const creator = pickGdCreatorName(gdb);
      if (!creator) {
        failed += 1;
        return;
      }
      const next = clipText(creator, 80);
      if ((level.creatorName || '').trim() === next) {
        skipped += 1;
        return;
      }
      await prisma.level.update({
        where: { id: level.id },
        data: { creatorName: next },
      });
      updated += 1;
    })
  );

  return {
    scanned: batch.length,
    updated,
    failed,
    skipped,
    done: !more,
    nextCursor: more ? batch[batch.length - 1].id : null,
  };
}

export async function refreshTimelineLevelCopy(cursor?: string | null): Promise<GdRefreshPage> {
  const rows = await prisma.timelineEvent.findMany({
    where: {
      sourceKey: { startsWith: SHEET_SOURCE_PREFIX },
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    orderBy: { id: 'asc' },
    take: TIMELINE_BATCH + 1,
    select: {
      id: true,
      sourceKey: true,
      startAt: true,
    },
  });
  const more = rows.length > TIMELINE_BATCH;
  const batch = more ? rows.slice(0, TIMELINE_BATCH) : rows;
  const gdIds = batch
    .map((row) => Number(String(row.sourceKey || '').slice(SHEET_SOURCE_PREFIX.length)))
    .filter((n) => Number.isFinite(n) && n > 0);

  const levels = await prisma.level.findMany({
    where: { gdLevelId: { in: gdIds } },
    select: {
      id: true,
      gdLevelId: true,
      name: true,
      creatorName: true,
      difficulty: true,
      difficultyFace: true,
      ratingType: true,
      mode: true,
      description: true,
      youtubeId: true,
    },
  });
  const byGd = new Map(levels.map((level) => [level.gdLevelId, level]));

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  await Promise.all(
    batch.map(async (event) => {
      const gdLevelId = Number(String(event.sourceKey || '').slice(SHEET_SOURCE_PREFIX.length));
      if (!Number.isFinite(gdLevelId) || gdLevelId <= 0) {
        failed += 1;
        return;
      }
      const level = byGd.get(gdLevelId);
      if (!level) {
        failed += 1;
        return;
      }

      let description = level.description || '';
      let youtubeId = level.youtubeId || null;
      let creatorName = (level.creatorName || '').trim();
      let name = level.name;

      const needGd = !description || !youtubeId || !creatorName || /^unknown$/i.test(creatorName);
      const gdb = needGd ? await fetchGdBrowser(gdLevelId) : null;
      if (gdb) {
        const fromGd = pickGdCreatorName(gdb);
        if (fromGd) creatorName = fromGd;
        const gdName = pickGdLevelName(gdb);
        if (gdName) name = gdName;
        if (!description && gdb.description) description = String(gdb.description);
        const yt = parseYoutubeVideoField(gdb.video) || parseYoutubeVideoField(gdb.youtube);
        if (!youtubeId && yt) youtubeId = yt;
      }

      const payload = {
        title: clipText(name, 160),
        shortDescription: levelChronicleShort(name, creatorName || 'Unknown'),
        fullDescription: levelChronicleHtml({
          name,
          creatorName: creatorName || 'Unknown',
          difficulty: level.difficulty,
          difficultyFace: level.difficultyFace,
          ratingType: level.ratingType,
          mode: level.mode,
          gdLevelId,
          description,
          ratedAt: event.startAt,
          youtubeId,
        }),
        tier: timelineTierForRating(level.ratingType),
      };

      await prisma.timelineEvent.update({
        where: { id: event.id },
        data: payload,
      });

      const levelPatch: { creatorName?: string; description?: string; youtubeId?: string } = {};
      if (creatorName && creatorName !== (level.creatorName || '').trim()) {
        levelPatch.creatorName = clipText(creatorName, 80);
      }
      if (description && description !== (level.description || '')) {
        levelPatch.description = clipText(description, 4000);
      }
      if (youtubeId && youtubeId !== level.youtubeId) {
        levelPatch.youtubeId = youtubeId;
      }
      if (Object.keys(levelPatch).length) {
        await prisma.level.update({ where: { id: level.id }, data: levelPatch });
      }
      updated += 1;
    })
  );

  return {
    scanned: batch.length,
    updated,
    failed,
    skipped,
    done: !more,
    nextCursor: more ? batch[batch.length - 1].id : null,
  };
}
