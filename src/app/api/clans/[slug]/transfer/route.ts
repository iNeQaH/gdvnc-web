import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isFullAdminRole, isSuperAdminUser } from '@/lib/roles';
import { publicApiError } from '@/lib/apiError';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
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

  const limited = rateLimit(`clan-transfer:${auth.userId}`, 5, 300_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const { slug } = await params;
    const clan = await prisma.clan.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        members: true,
      },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const currentMember = clan.members.find((m) => m.userId === auth.userId);
    const isClanLeader = currentMember?.role === 'LEADER';
    const isWebAdmin = isFullAdminRole(auth.role) || isSuperAdminUser(auth);

    // QUY TẮC: Chỉ Leader Clan hoặc Admin web mới có quyền chuyển giao chức Leader
    if (!isClanLeader && !isWebAdmin) {
      return NextResponse.json(
        { error: 'Chỉ Leader hiện tại hoặc Admin website mới có quyền chuyển giao vị trí Leader.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const targetUserId = body.targetUserId;
    if (!targetUserId) {
      return NextResponse.json({ error: 'Vui lòng chọn thành viên tiếp quản.' }, { status: 400 });
    }

    const targetMember = clan.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      return NextResponse.json(
        { error: 'Người được chỉ định không phải thành viên của Clan này.' },
        { status: 400 }
      );
    }

    if (targetMember.userId === clan.leaderId) {
      return NextResponse.json({ error: 'Thành viên này đã là Leader.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Đổi role leader cũ về MODERATOR hoặc MEMBER
      await tx.clanMember.updateMany({
        where: { clanId: clan.id, role: 'LEADER' },
        data: { role: 'MODERATOR' },
      });

      // Đổi role thành viên mới lên LEADER
      await tx.clanMember.update({
        where: { id: targetMember.id },
        data: { role: 'LEADER' },
      });

      // Cập nhật leaderId của Clan
      await tx.clan.update({
        where: { id: clan.id },
        data: { leaderId: targetUserId },
      });
    });

    return NextResponse.json({ success: true, message: 'Đã chuyển giao vị trí Leader thành công.' });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi chuyển giao Leader.');
  }
}
