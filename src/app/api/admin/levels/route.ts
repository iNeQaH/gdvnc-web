import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateBasePp } from '@/lib/ScoringEngine';
import { upsertLevelFromForm, triggerBackgroundPpRecalc } from '@/lib/upsertLevel';
import { persistLocalListSnapshot } from '@/lib/listSnapshot';
import { LevelMode } from '@prisma/client';

export async function POST(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    if (!body.gdLevelId) return NextResponse.json({ error: 'Thiếu Level ID.' }, { status: 400 });
    const result = await upsertLevelFromForm(body);
    return NextResponse.json({ success: true, level: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    if (body?.unlinkCreator && body.id) {
      await prisma.level.update({
        where: { id: body.id },
        data: { creatorId: null },
      });
      return NextResponse.json({ success: true });
    }
    if (body?.id && typeof body.isChallenge === 'boolean') {
      await prisma.level.update({
        where: { id: body.id },
        data: { isChallenge: body.isChallenge },
      });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const level = await prisma.level.findUnique({ where: { id } });
    if (!level) return NextResponse.json({ error: 'Level not found' }, { status: 404 });

    const oldPlacement = level.placement;
    const oldVnPlacement = level.vnPlacement;
    const mode = level.mode;
    let affectedLevelIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      await tx.level.delete({ where: { id } });

      if (oldVnPlacement !== null) {
        await tx.level.updateMany({
          where: { isVN: true, isChallenge: false, vnPlacement: { gt: oldVnPlacement } },
          data: { vnPlacement: { decrement: 1 } },
        });
      }

      if (oldPlacement !== null) {
        await tx.level.updateMany({
          where: { mode, isChallenge: false, placement: { gt: oldPlacement } },
          data: { placement: { decrement: 1 } },
        });

        const allRankedLevels = await tx.level.findMany({
          where: { mode, isChallenge: false, placement: { not: null } },
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
      }
    }, { maxWait: 15000, timeout: 30000 });

    triggerBackgroundPpRecalc([id, ...affectedLevelIds], mode);

    if (!level.isChallenge) {
      void persistLocalListSnapshot(mode === LevelMode.PLATFORMER ? 'PLATFORMER' : 'CLASSIC').catch((err) =>
        console.error('Failed to persist local list snapshot', err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
