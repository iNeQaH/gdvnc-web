import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperAdminUser } from '@/lib/roles';
import { publicApiError } from '@/lib/apiError';
import { isBrowserSameOriginFetch } from '@/lib/origin';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }

  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { slug, id: banId } = await params;
    const clan = await prisma.clan.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        members: { where: { userId: auth.userId } },
      },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const member = clan.members[0];
    const isClanLeader = member?.role === 'LEADER';
    const isClanMod = member?.role === 'MODERATOR';
    const isOwner = isSuperAdminUser(auth);

    if (!isClanLeader && !isClanMod && !isOwner) {
      return NextResponse.json(
        { error: 'Chỉ Leader hoặc Quản trị viên Clan mới có quyền gỡ chặn.' },
        { status: 403 }
      );
    }

    // Tìm ban row
    const banRows = await prisma.$queryRaw<Array<{ id: string; userId: string; username: string | null }>>`
      SELECT b.id, b."userId", u.username
      FROM "ClanBan" b
      LEFT JOIN "User" u ON b."userId" = u.id
      WHERE b.id = ${banId} AND b."clanId" = ${clan.id}
      LIMIT 1
    `;

    if (banRows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy mục chặn.' }, { status: 404 });
    }

    const ban = banRows[0];

    await prisma.$executeRaw`DELETE FROM "ClanBan" WHERE id = ${banId}`;

    // Gửi thông báo đến mailbox người được gỡ chặn
    try {
      await prisma.notification.create({
        data: {
          userId: ban.userId,
          title: `Đã được gỡ chặn khỏi Clan [${clan.tag}]`,
          message: `Bạn đã được gỡ chặn khỏi Clan [${clan.tag}] ${clan.name}. Bây giờ bạn có thể gửi đơn xin gia nhập.`,
        },
      });
    } catch (e) {
      console.warn('Notification on unban failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Đã gỡ chặn cho ${ban.username || 'người dùng'}.`,
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi gỡ chặn người dùng.');
  }
}
