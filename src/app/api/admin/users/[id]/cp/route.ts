import { requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { recalculateCreatorPoints } from '@/lib/recalculateCreatorPoints';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireFullAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { action, creatorPoints } = await req.json();

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    if (action === 'reset') {
      await prisma.creatorWork.updateMany({
        where: { userId: id, status: RecordStatus.APPROVED },
        data: { cpGranted: 0 },
      });
      const total = await recalculateCreatorPoints(id);
      return NextResponse.json({ success: true, creatorPoints: total });
    }

    if (action === 'recalc') {
      const total = await recalculateCreatorPoints(id);
      return NextResponse.json({ success: true, creatorPoints: total });
    }

    if (action === 'set') {
      const value = Number(creatorPoints);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: 'Creator Points không hợp lệ.' }, { status: 400 });
      }
      const rounded = Math.round(value * 10) / 10;
      await prisma.user.update({
        where: { id },
        data: { creatorPoints: rounded },
      });
      return NextResponse.json({ success: true, creatorPoints: rounded });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật Creator Points.' }, { status: 500 });
  }
}
