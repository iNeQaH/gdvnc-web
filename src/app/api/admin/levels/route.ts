import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateBasePp } from '@/lib/ScoringEngine';
import { upsertLevelFromForm, triggerBackgroundPpRecalc } from '@/lib/upsertLevel';

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

export async function DELETE(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const level = await prisma.level.findUnique({ where: { id } });
    if (!level) return NextResponse.json({ error: 'Level not found' }, { status: 404 });

    const oldPlacement = level.placement;
    const mode = level.mode;
    let affectedLevelIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      // 1. Delete the level (Cascade deletes records)
      await tx.level.delete({ where: { id } });

      // 2. Shift placements up (decrement)
      if (oldPlacement !== null) {
        await tx.level.updateMany({
          where: { mode, isChallenge: false, placement: { gt: oldPlacement } },
          data: { placement: { decrement: 1 } }
        });

        // 3. Recompute base PPs
        const allRankedLevels = await tx.level.findMany({
          where: { mode, isChallenge: false, placement: { not: null } },
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
    if (updatesToRun.length > 0) {
      for (let i = 0; i < updatesToRun.length; i += 500) {
        const chunk = updatesToRun.slice(i, i + 500);
        
        // Chú ý: Dùng dấu ngoặc kép (") cho "Level", "basePp" và "id"
        let sql = 'UPDATE "Level" SET "basePp" = CASE "id" ';
        const ids = [];
        
        for (const u of chunk) {
          // u.id vẫn dùng nháy đơn (') vì đây là giá trị string UUID
          sql += `WHEN '${u.id}' THEN ${u.correctPp} `;
          ids.push(`'${u.id}'`);
        }
        
        sql += `END WHERE "id" IN (${ids.join(',')});`;
        
        await tx.$executeRawUnsafe(sql);
      }
    }
      }
    }, { maxWait: 15000, timeout: 30000 });

    // We must recalculate users who had records on the deleted level OR shifted levels
    triggerBackgroundPpRecalc([id, ...affectedLevelIds], mode);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
