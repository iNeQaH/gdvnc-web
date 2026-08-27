import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { notificationRetentionCutoff, purgeExpiredNotifications } from '@/lib/purgeExpiredNotifications';

export async function GET() {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await purgeExpiredNotifications(auth.userId);

    const cutoff = notificationRetentionCutoff();
    const notifications = await prisma.notification.findMany({
      where: { userId: auth.userId, createdAt: { gt: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: auth.userId, isRead: false, createdAt: { gt: cutoff } },
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi lấy thông báo.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: auth.userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'Đã đánh dấu đọc tất cả.' });
    }

    if (notificationId) {
      const existing = await prisma.notification.findFirst({
        where: { id: notificationId, userId: auth.userId },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Không tìm thấy thông báo.' }, { status: 404 });
      }
      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, notification: updated });
    }

    return NextResponse.json({ error: 'Thiếu thông tin cập nhật.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật thông báo.' }, { status: 500 });
  }
}
