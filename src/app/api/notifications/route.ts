import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
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
  try {
    const body = await req.json();
    const { notificationId, userId, markAll } = body;

    if (markAll && userId) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'Đã đánh dấu đọc tất cả.' });
    }

    if (notificationId) {
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
