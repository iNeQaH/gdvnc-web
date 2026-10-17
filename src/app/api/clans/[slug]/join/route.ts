import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { syncAndGetClanSp } from '@/lib/clan';
import { clipText } from '@/lib/validate';
import { publicApiError } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const clan = await prisma.clan.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        members: { select: { userId: true } },
      },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const synced = await syncAndGetClanSp(clan.id);
    if (synced?.isSuspended) {
      return NextResponse.json(
        { error: 'Clan đang tạm ngưng hoạt động do thiếu SP coin, không thể nhận thêm thành viên.' },
        { status: 400 }
      );
    }

    if (synced && synced.memberCount >= synced.maxMembers) {
      return NextResponse.json(
        { error: `Clan đã đạt giới hạn tối đa ${synced.maxMembers} thành viên của ${synced.tierName}.` },
        { status: 400 }
      );
    }

    // Kiểm tra xem người dùng đã thuộc clan nào chưa
    const existing = await prisma.clanMember.findUnique({
      where: { userId: auth.userId },
      include: { clan: { select: { name: true, tag: true } } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Bạn đã tham gia Clan [${existing.clan.tag}] ${existing.clan.name}. Cần rời clan cũ trước.` },
        { status: 400 }
      );
    }

    // Kiểm tra người dùng có bị chặn (ban) khỏi clan này không
    try {
      const banRows = await prisma.$queryRaw<Array<{ id: string; expiresAt: Date | null; reason: string | null }>>`
        SELECT id, "expiresAt", reason FROM "ClanBan"
        WHERE "clanId" = ${clan.id} AND "userId" = ${auth.userId}
        LIMIT 1
      `;
      if (banRows.length > 0) {
        const ban = banRows[0];
        if (!ban.expiresAt || new Date(ban.expiresAt) > new Date()) {
          const timeStr = ban.expiresAt
            ? `đến ${new Date(ban.expiresAt).toLocaleDateString('vi-VN')}`
            : 'vĩnh viễn';
          return NextResponse.json(
            {
              error: `Bạn đã bị chặn tham gia Clan này (${timeStr}).${ban.reason ? ` Lý do: ${ban.reason}` : ''}`,
            },
            { status: 403 }
          );
        } else {
          // Ban đã hết hạn, tự động xóa
          await prisma.$executeRaw`DELETE FROM "ClanBan" WHERE id = ${ban.id}`;
        }
      }
    } catch (e) {
      console.warn('ClanBan check warning:', e);
    }

    const body = await req.json().catch(() => ({}));
    const message = clipText(body.message, 200)?.trim() || null;

    const request = await prisma.clanJoinRequest.upsert({
      where: {
        clanId_userId: {
          clanId: clan.id,
          userId: auth.userId,
        },
      },
      create: {
        clanId: clan.id,
        userId: auth.userId,
        message,
        status: 'PENDING',
      },
      update: {
        message,
        status: 'PENDING',
      },
    });

    // Thông báo vào mailbox cho mod và leader
    try {
      const applicant = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { username: true },
      });
      const applicantName = applicant?.username || 'Thành viên';

      const staffMembers = await prisma.clanMember.findMany({
        where: {
          clanId: clan.id,
          role: { in: ['LEADER', 'MODERATOR'] },
        },
        select: { userId: true },
      });

      const targetUserIds = new Set<string>();
      if (clan.leaderId) targetUserIds.add(clan.leaderId);
      for (const m of staffMembers) {
        targetUserIds.add(m.userId);
      }
      targetUserIds.delete(auth.userId);

      if (targetUserIds.size > 0) {
        const notificationTitle = `Đơn xin gia nhập Clan [${clan.tag}]`;
        const notificationMessage = `Người chơi ${applicantName} đã gửi đơn xin gia nhập Clan [${clan.tag}] ${clan.name}.${message ? ` Lời nhắn: "${message}"` : ''}`;

        await prisma.notification.createMany({
          data: Array.from(targetUserIds).map((uid) => ({
            userId: uid,
            title: notificationTitle,
            message: notificationMessage,
          })),
        });
      }
    } catch (notifyErr) {
      console.error('Lỗi khi gửi thông báo xin gia nhập clan:', notifyErr);
    }

    return NextResponse.json({ success: true, request });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi gửi đơn xin gia nhập.');
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const clan = await prisma.clan.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true, name: true, tag: true },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const deleted = await prisma.clanJoinRequest.deleteMany({
      where: {
        clanId: clan.id,
        userId: auth.userId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Bạn không có đơn xin gia nhập nào đang chờ duyệt tại Clan này.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã hủy yêu cầu xin gia nhập Clan thành công.',
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi hủy đơn xin gia nhập.');
  }
}
