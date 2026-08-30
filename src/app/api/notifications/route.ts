import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { notificationRetentionCutoff, purgeExpiredNotifications } from '@/lib/purgeExpiredNotifications';
import { canSeeAnnouncement } from '@/lib/announcements';

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
    const viewer = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, role: true, supporterUntil: true },
    });
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [personal, broadcasts] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: auth.userId, createdAt: { gt: cutoff } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.siteAnnouncement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 80,
        include: { author: { select: { username: true } } },
      }),
    ]);

    const visible = broadcasts.filter((row) => canSeeAnnouncement(viewer, row));
    const reads = visible.length
      ? await prisma.announcementRead.findMany({
          where: { userId: viewer.id, announcementId: { in: visible.map((r) => r.id) } },
          select: { announcementId: true },
        })
      : [];
    const readIds = new Set(reads.map((r) => r.announcementId));

    const inbox = [
      ...personal.map((n) => ({
        id: n.id,
        kind: 'inbox' as const,
        title: n.title,
        message: n.message,
        body: n.message,
        author: null as string | null,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      ...visible.map((a) => ({
        id: a.id,
        kind: 'announcement' as const,
        title: a.title,
        message: a.excerpt,
        body: a.body,
        author: a.author.username,
        isRead: readIds.has(a.id),
        createdAt: a.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 50);

    const unreadCount = inbox.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications: inbox,
      unreadCount,
    });
  } catch (error: any) {
    if (error?.code === 'P2021' || String(error?.message || '').includes('SiteAnnouncement')) {
      const cutoff = notificationRetentionCutoff();
      const personal = await prisma.notification.findMany({
        where: { userId: auth.userId, createdAt: { gt: cutoff } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const unreadCount = personal.filter((n) => !n.isRead).length;
      return NextResponse.json({
        success: true,
        notifications: personal.map((n) => ({
          id: n.id,
          kind: 'inbox' as const,
          title: n.title,
          message: n.message,
          body: n.message,
          author: null,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      });
    }
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
    const { notificationId, announcementId, markAll } = body;

    if (markAll) {
      const viewer = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, role: true, supporterUntil: true },
      });
      await prisma.notification.updateMany({
        where: { userId: auth.userId, isRead: false },
        data: { isRead: true },
      });
      if (viewer) {
        const broadcasts = await prisma.siteAnnouncement.findMany({
          select: { id: true, audience: true, targetUserIds: true },
        });
        const visibleIds = broadcasts.filter((row) => canSeeAnnouncement(viewer, row)).map((r) => r.id);
        if (visibleIds.length) {
          await prisma.announcementRead.createMany({
            data: visibleIds.map((announcementId) => ({ announcementId, userId: viewer.id })),
            skipDuplicates: true,
          });
        }
      }
      return NextResponse.json({ success: true, message: 'Đã đánh dấu đọc tất cả.' });
    }

    if (announcementId) {
      const row = await prisma.siteAnnouncement.findUnique({
        where: { id: announcementId },
        select: { id: true, audience: true, targetUserIds: true },
      });
      if (!row) return NextResponse.json({ error: 'Không tìm thấy thông báo.' }, { status: 404 });
      const viewer = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, role: true, supporterUntil: true },
      });
      if (!viewer || !canSeeAnnouncement(viewer, row)) {
        return NextResponse.json({ error: 'Không tìm thấy thông báo.' }, { status: 404 });
      }
      await prisma.announcementRead.upsert({
        where: { announcementId_userId: { announcementId: row.id, userId: viewer.id } },
        create: { announcementId: row.id, userId: viewer.id },
        update: {},
      });
      return NextResponse.json({ success: true });
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
