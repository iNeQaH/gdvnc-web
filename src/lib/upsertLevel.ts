import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { calculateBasePp } from '@/lib/ScoringEngine';
import { recalculateUserPp as recalcUserPp } from '@/lib/recordUtils';

export async function triggerBackgroundPpRecalc(levelIds: string[], mode: LevelMode) {
  const records = await prisma.record.findMany({
    where: { levelId: { in: levelIds }, status: RecordStatus.APPROVED },
    select: { userId: true },
    distinct: ['userId'],
  });
  Promise.all(records.filter((r) => r.userId).map((r) => recalcUserPp(r.userId!))).catch(console.error);
}

export function extractYoutubeId(videoUrl?: string | null): string | null {
  if (!videoUrl) return null;
  const raw = String(videoUrl).trim();
  if (/^[\w-]{11}$/.test(raw)) return raw;
  const ytMatch = raw.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return ytMatch ? ytMatch[1] : null;
}

/** Keep stored video; fill from upstream only when local is empty. */
export function preferYoutubeId(
  incoming?: string | null,
  existing?: string | null
): string | null {
  return existing || incoming || null;
}

/** Keep custom min-percent; replace dummy 100 with Pointercrate requirement. */
export function preferMinPercent(incoming?: number | null, existing?: number | null): number {
  const inc = Number(incoming);
  const ex = Number(existing);
  const incOk = Number.isFinite(inc) && inc >= 1 && inc <= 100;
  const exOk = Number.isFinite(ex) && ex >= 1 && ex <= 100;
  if (exOk && ex !== 100) return Math.round(ex);
  if (incOk) return Math.round(inc);
  if (exOk) return Math.round(ex);
  return 100;
}

export function preferText(incoming?: string | null, existing?: string | null): string | null {
  const a = String(incoming ?? '').trim();
  if (a) return a;
  const b = String(existing ?? '').trim();
  if (b) return b;
  return null;
}

export async function fetchGdBrowser(gdLevelId: number): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const gdbRes = await fetch(`https://gdbrowser.com/api/level/${gdLevelId}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!gdbRes.ok) return null;
    return await gdbRes.json();
  } catch {
    return null;
  }
}

async function shiftPlacementsAndRecalcPp(
  tx: any,
  pMode: LevelMode,
  targetPlacement: number | null,
  existingLevel: { id: string; placement: number | null } | null
) {
  const affectedLevelIds: string[] = [];

  if (targetPlacement !== null) {
    if (!existingLevel) {
      await tx.level.updateMany({
        where: { mode: pMode, isChallenge: false, placement: { gte: targetPlacement } },
        data: { placement: { increment: 1 } },
      });
    } else {
      const oldPlacement = existingLevel.placement;
      if (oldPlacement !== null && oldPlacement !== targetPlacement) {
        if (oldPlacement < targetPlacement) {
          await tx.level.updateMany({
            where: { mode: pMode, isChallenge: false, placement: { gt: oldPlacement, lte: targetPlacement } },
            data: { placement: { decrement: 1 } },
          });
        } else {
          await tx.level.updateMany({
            where: { mode: pMode, isChallenge: false, placement: { gte: targetPlacement, lt: oldPlacement } },
            data: { placement: { increment: 1 } },
          });
        }
      } else if (oldPlacement === null) {
        await tx.level.updateMany({
          where: { mode: pMode, isChallenge: false, placement: { gte: targetPlacement } },
          data: { placement: { increment: 1 } },
        });
      }
    }
  }

  const allRankedLevels = await tx.level.findMany({
    where: { mode: pMode, isChallenge: false, placement: { not: null } },
    select: { id: true, placement: true, basePp: true },
  });

  const updatesToRun: { id: string; correctPp: number }[] = [];
  for (const lvl of allRankedLevels) {
    const correctPp = calculateBasePp(lvl.placement!);
    if (Math.abs(correctPp - lvl.basePp) > 0.01) {
      affectedLevelIds.push(lvl.id);
      updatesToRun.push({ id: lvl.id, correctPp });
    }
  }
  if (updatesToRun.length > 0) {
    for (let i = 0; i < updatesToRun.length; i += 500) {
      const chunk = updatesToRun.slice(i, i + 500);
      let sql = 'UPDATE "Level" SET "basePp" = CASE "id" ';
      const ids = [];
      
      for (const u of chunk) {
        sql += `WHEN '${u.id}' THEN ${u.correctPp} `;
        ids.push(`'${u.id}'`);
      }
      
      sql += `END WHERE "id" IN (${ids.join(',')});`;
      
      await tx.$executeRawUnsafe(sql);
    }
  }
  return affectedLevelIds;
}

export async function getOrCreateStubLevel(input: {
  gdLevelId: number;
  name?: string;
  creatorName?: string;
  isPlatformer?: boolean;
}) {
  const existing = await prisma.level.findUnique({ where: { gdLevelId: input.gdLevelId } });
  if (existing) return existing;
  const data = {
    gdLevelId: input.gdLevelId,
    name: input.name || 'Unknown Level',
    creatorName: input.creatorName || 'Unknown',
    mode: input.isPlatformer ? LevelMode.PLATFORMER : LevelMode.CLASSIC,
    difficulty: 'Unrated',
    basePp: 0,
    placement: null as number | null,
  };
  try {
    return await prisma.level.create({ data });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const raced = await prisma.level.findUnique({ where: { gdLevelId: input.gdLevelId } });
      if (raced) return raced;
    }
    throw error;
  }
}

export async function upsertLevelFromForm(input: {
  id?: string;
  gdLevelId: number | string;
  videoUrl?: string;
  minPercent?: number | string;
  placement?: number | string | null;
  mode?: LevelMode | string;
  isVN?: boolean;
  isChallenge?: boolean;
  difficultyFace?: number;
  ratingType?: string;
}) {
  const gdLevelId = parseInt(String(input.gdLevelId), 10);
  if (!gdLevelId) throw new Error('Thiếu Level ID.');

  const youtubeId = extractYoutubeId(input.videoUrl);
  const pMode = (input.mode as LevelMode) || LevelMode.CLASSIC;
  const targetPlacement =
    input.placement !== undefined && input.placement !== null && input.placement !== ''
      ? parseInt(String(input.placement), 10)
      : null;

  const existingLevel = input.id
    ? await prisma.level.findUnique({ where: { id: input.id } })
    : await prisma.level.findUnique({ where: { gdLevelId } });

  if (existingLevel && existingLevel.gdLevelId !== gdLevelId) {
    const clash = await prisma.level.findUnique({ where: { gdLevelId } });
    if (clash && clash.id !== existingLevel.id) {
      throw new Error('Level ID này đã tồn tại trên danh sách.');
    }
  }

  const idChanged = !existingLevel || existingLevel.gdLevelId !== gdLevelId;
  const gdbData = idChanged ? await fetchGdBrowser(gdLevelId) : null;
  if (!existingLevel && !gdbData) {
    throw new Error('Không thể lấy thông tin Level từ máy chủ GD. ID có đúng không?');
  }

  const name = gdbData?.name || existingLevel?.name || 'Unknown';
  const creatorName = gdbData?.author || existingLevel?.creatorName || 'Unknown';
  const difficulty = gdbData?.difficulty || existingLevel?.difficulty || 'Demon';
  const description =
    gdbData?.description !== undefined && gdbData?.description !== null
      ? gdbData.description
      : existingLevel?.description || '';

  const isChallengeLevel = input.isChallenge !== undefined ? !!input.isChallenge : !!existingLevel?.isChallenge;

  const placementChanged =
    !isChallengeLevel &&
    (!existingLevel ||
      existingLevel.placement !== targetPlacement ||
      existingLevel.mode !== pMode);

  const finalPp = targetPlacement ? calculateBasePp(targetPlacement) : 0;
  const affectedLevelIds: string[] = [];

  const updateData: any = {
    gdLevelId,
    name,
    creatorName,
    difficulty,
    description,
    youtubeId: youtubeId ?? existingLevel?.youtubeId ?? null,
    placement: targetPlacement,
    minPercent: input.minPercent ? parseInt(String(input.minPercent), 10) : 100,
    basePp: finalPp,
    mode: pMode,
    isVN: input.isVN !== undefined ? input.isVN : false,
    isChallenge: input.isChallenge !== undefined ? !!input.isChallenge : false,
    difficultyFace: input.difficultyFace !== undefined ? input.difficultyFace : 10,
    ratingType: input.ratingType !== undefined ? input.ratingType : 'NONE',
  };

  await prisma.$transaction(
    async (tx) => {
      if (placementChanged) {
        const shifted = await shiftPlacementsAndRecalcPp(tx, pMode, targetPlacement, existingLevel);
        affectedLevelIds.push(...shifted);
      }

      let upserted;
      if (existingLevel) {
        upserted = await tx.level.update({
          where: { id: existingLevel.id },
          data: updateData,
        });
      } else {
        try {
          upserted = await tx.level.create({
            data: { gdLevelId, ...updateData },
          });
        } catch (error: any) {
          if (error?.code !== 'P2002') throw error;
          upserted = await tx.level.update({
            where: { gdLevelId },
            data: updateData,
          });
        }
      }

      if (!affectedLevelIds.includes(upserted.id)) {
        affectedLevelIds.push(upserted.id);
      }
    },
    { maxWait: 15000, timeout: 30000 }
  );

  if (affectedLevelIds.length > 0 && placementChanged) {
    triggerBackgroundPpRecalc(affectedLevelIds, pMode);
  }

  // Re-align every ranked level in this mode to the server PP formula
  // (Pointercrate imports previously wrote a different curve).
  void prisma.level
    .findMany({
      where: { mode: pMode, isChallenge: false, placement: { not: null } },
      select: { id: true, placement: true, basePp: true },
    })
    .then(async (ranked) => {
      const diffs = ranked.filter(
        (l) => Math.abs(calculateBasePp(l.placement!) - l.basePp) > 0.01
      );
      for (const l of diffs) {
        await prisma.level.update({
          where: { id: l.id },
          data: { basePp: calculateBasePp(l.placement!) },
        });
      }
      if (diffs.length > 0) {
        triggerBackgroundPpRecalc(diffs.map((d) => d.id), pMode);
      }
    })
    .catch(console.error);

  return { name, creatorName, gdLevelId };
}
