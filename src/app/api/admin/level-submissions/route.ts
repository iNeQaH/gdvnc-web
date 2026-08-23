import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const submissions = await prisma.levelSubmission.findMany({
      where: { status: RecordStatus.PENDING },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: [
        { prioritySp: 'desc' },
        { submittedAt: 'asc' }
      ],
    });
    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
