import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { calculateBasePp, calculateTotalPp } from '@/lib/ScoringEngine';

async function recalculateUserPp(userId: string, mode: LevelMode) {
  const records = await prisma.record.findMany({
    where: {
      userId,
      status: RecordStatus.APPROVED,
      level: { mode },
    },
    include: { level: true },
  });
  const basePps = records.map((r) => r.level.basePp);
  const totalPp = calculateTotalPp(basePps);

  if (mode === LevelMode.CLASSIC) {
    await prisma.user.update({ where: { id: userId }, data: { classicPp: totalPp } });
  } else {
    await prisma.user.update({ where: { id: userId }, data: { platformerPp: totalPp } });
  }
}

export async function triggerBackgroundPpRecalc(levelIds: string[], mode: LevelMode) {
  const records = await prisma.record.findMany({
    where: { levelId: { in: levelIds }, status: RecordStatus.APPROVED },
    select: { userId: true },
    distinct: ['userId'],
  });
  Promise.all(records.map((r) => recalculateUserPp(r.userId, mode))).catch(console.error);
}

export async function upsertLevelFromForm(input: {
  gdLevelId: number | string;
  videoUrl?: string;
  minPercent?: number | string;
  placement?: number | string | null;
  mode?: LevelMode | string;
  isVN?: boolean;
  difficultyFace?: number;
  ratingType?: string;
}) {
  const gdLevelId = parseInt(String(input.gdLevelId), 10);
  if (!gdLevelId) throw new Error('Thiếu Level ID.');

  let youtubeId: string | null = null;
  if (input.videoUrl) {
    const ytMatch = input.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) youtubeId = ytMatch[1];
  }

  const gdbRes = await fetch(`https://gdbrowser.com/api/level/${gdLevelId}`);
  if (!gdbRes.ok) {
    throw new Error('Không thể lấy thông tin Level từ máy chủ GD. ID có đúng không?');
  }
  const gdbData = await gdbRes.json();

  const name = gdbData.name || 'Unknown';
  const creatorName = gdbData.author || 'Unknown';
  const difficulty = gdbData.difficulty || 'Demon';
  const description = gdbData.description || '';
  const pMode = (input.mode as LevelMode) || LevelMode.CLASSIC;
  const targetPlacement = input.placement !== undefined && input.placement !== null && input.placement !== ''
    ? parseInt(String(input.placement), 10)
    : null;

  const existingLevel = await prisma.level.findUnique({ where: { gdLevelId } });
  const affectedLevelIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (targetPlacement !== null) {
      if (!existingLevel) {
        await tx.level.updateMany({
          where: { mode: pMode, placement: { gte: targetPlacement } },
          data: { placement: { increment: 1 } },
        });
      } else {
        const oldPlacement = existingLevel.placement;
        if (oldPlacement !== null && oldPlacement !== targetPlacement) {
          if (oldPlacement < targetPlacement) {
            await tx.level.updateMany({
              where: { mode: pMode, placement: { gt: oldPlacement, lte: targetPlacement } },
              data: { placement: { decrement: 1 } },
            });
          } else {
            await tx.level.updateMany({
              where: { mode: pMode, placement: { gte: targetPlacement, lt: oldPlacement } },
              data: { placement: { increment: 1 } },
            });
          }
        } else if (oldPlacement === null) {
          await tx.level.updateMany({
            where: { mode: pMode, placement: { gte: targetPlacement } },
            data: { placement: { increment: 1 } },
          });
        }
      }
    }

    const allRankedLevels = await tx.level.findMany({
      where: { mode: pMode, placement: { not: null } },
      select: { id: true, placement: true, basePp: true },
    });

    const updatesToRun = [];
    for (const lvl of allRankedLevels) {
      const correctPp = calculateBasePp(lvl.placement!);
      if (Math.abs(correctPp - lvl.basePp) > 0.01) {
        affectedLevelIds.push(lvl.id);
        updatesToRun.push({ id: lvl.id, correctPp });
      }
    }
    // Run updates in chunks of 50 to avoid TiDB serverless timeouts
    for (let i = 0; i < updatesToRun.length; i += 50) {
      const chunk = updatesToRun.slice(i, i + 50);
      await Promise.all(chunk.map(u => tx.level.update({
        where: { id: u.id },
        data: { basePp: u.correctPp }
      })));
    }

    const finalPp = targetPlacement ? calculateBasePp(targetPlacement) : 0;
    const updateData = {
      name,
      creatorName,
      difficulty,
      description,
      youtubeId,
      placement: targetPlacement,
      minPercent: input.minPercent ? parseInt(String(input.minPercent), 10) : 100,
      basePp: finalPp,
      mode: pMode,
      isVN: input.isVN !== undefined ? input.isVN : false,
      difficultyFace: input.difficultyFace !== undefined ? input.difficultyFace : 10,
      ratingType: input.ratingType !== undefined ? input.ratingType : 'NONE',
    };

    const upsertedLevel = await tx.level.upsert({
      where: { gdLevelId },
      update: updateData,
      create: { gdLevelId, ...updateData },
    });

    if (!affectedLevelIds.includes(upsertedLevel.id)) {
      affectedLevelIds.push(upsertedLevel.id);
    }
  }, { maxWait: 15000, timeout: 30000 });

  if (affectedLevelIds.length > 0) {
    triggerBackgroundPpRecalc(affectedLevelIds, pMode);
  }

  return { name, creatorName, gdLevelId };
}
