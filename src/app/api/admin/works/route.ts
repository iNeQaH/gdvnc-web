import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const works = await prisma.creatorWork.findMany({
      where: { status: RecordStatus.PENDING },
      include: {
        user: {
          select: { username: true, id: true }
        }
      },
      orderBy: [
        { prioritySp: 'desc' },
        { submittedAt: 'asc' }
      ]
    });
    return NextResponse.json({ success: true, works });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
