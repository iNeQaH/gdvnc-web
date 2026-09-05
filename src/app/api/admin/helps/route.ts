import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_LIST_LIMIT, parsePageParam } from '@/lib/adminQueue';
import { clipReviewNote, notifyWithNote } from '@/lib/reviewNote';

const pending = { status: 'PENDING' };

export async function GET(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { searchParams } = new URL(req.url);
    const page = parsePageParam(searchParams.get('page'));
    const skip = (page - 1) * ADMIN_LIST_LIMIT;

    const [helps, total] = await Promise.all([
      prisma.helpRequest.findMany({
        where: pending,
        orderBy: { createdAt: 'desc' },
        skip,
        take: ADMIN_LIST_LIMIT,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, gdUsername: true, gdVerified: true } },
        },
      }),
      prisma.helpRequest.count({ where: pending }),
    ]);

    return NextResponse.json({ success: true, helps, page, limit: ADMIN_LIST_LIMIT, total });
  } catch (error: any) {
    console.error('Admin helps GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id, action, reason } = await req.json();
    if (!id || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const reviewNote = clipReviewNote(reason);
    if (action === 'REJECT' && !reviewNote) {
      return NextResponse.json({ error: 'NEED_REASON' }, { status: 400 });
    }

    const help = await prisma.helpRequest.findUnique({ where: { id } });
    if (!help) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    try {
      await prisma.helpRequest.update({
        where: { id },
        data: { status, reviewNote: reviewNote || null },
      });
    } catch {
      await prisma.helpRequest.update({ where: { id }, data: { status } });
    }

    if (help.userId) {
      await prisma.notification.create({
        data: {
          userId: help.userId,
          title: action === 'APPROVE' ? 'Yêu cầu hỗ trợ đã được duyệt' : 'Yêu cầu hỗ trợ bị từ chối',
          message:
            action === 'APPROVE'
              ? notifyWithNote(`Yêu cầu "${help.title}" đã được admin duyệt.`, reviewNote)
              : `Yêu cầu "${help.title}" bị từ chối. Lý do: ${reviewNote}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin helps PATCH error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
