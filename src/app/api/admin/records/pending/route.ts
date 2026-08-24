import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const pending = await prisma.record.findMany({
      where: { status: RecordStatus.PENDING },
      include: {
        user: true,
        level: true,
      },
      orderBy: { submittedAt: 'asc' },
    });

    return NextResponse.json({ success: true, records: pending });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách chờ duyệt.' }, { status: 500 });
  }
}
