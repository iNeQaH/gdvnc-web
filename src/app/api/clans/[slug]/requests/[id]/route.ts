import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateUserSp, syncAndGetClanSp } from '@/lib/clan';
import { clearLeaderboardCache } from '@/lib/leaderboard';
import { isSuperAdminUser } from '@/lib/roles';
import { publicApiError } from '@/lib/apiError';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { slug, id: requestId } = await params;
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
        { error: 'Chỉ Leader hoặc Quản trị viên Clan mới có quyền duyệt thành viên.' },
        { status: 403 }
      );
    }

    const joinRequest = await prisma.clanJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            supporterUntil: true,
            spGrants: {
              select: { amount: true, expiresAt: true },
            },
          },
        },
      },
    });
    if (!joinRequest || joinRequest.clanId !== clan.id) {
      return NextResponse.json({ error: 'Không tìm thấy đơn gia nhập.' }, { status: 404 });
    }

    const body = await req.json();
    const action = body.action; // 'approve' | 'reject'

    if (action === 'reject') {
      await prisma.clanJoinRequest.delete({ where: { id: requestId } });
      return NextResponse.json({ success: true, message: 'Đã từ chối đơn gia nhập.' });
    }

    if (action === 'approve') {
      const synced = await syncAndGetClanSp(clan.id);
      if (synced && synced.memberCount >= synced.maxMembers) {
        return NextResponse.json(
          { error: `Clan đã đạt giới hạn tối đa ${synced.maxMembers} thành viên.` },
          { status: 400 }
        );
      }

      // Kiểm tra user có thuộc clan nào khác không
      const already = await prisma.clanMember.findUnique({
        where: { userId: joinRequest.userId },
      });
      if (already) {
        await prisma.clanJoinRequest.delete({ where: { id: requestId } });
        return NextResponse.json(
          { error: 'Người chơi này đã tham gia một Clan khác.' },
          { status: 400 }
        );
      }

      const userSp = calculateUserSp(joinRequest.user);

      await prisma.$transaction(async (tx) => {
        await tx.clanMember.create({
          data: {
            clanId: clan.id,
            userId: joinRequest.userId,
            role: 'MEMBER',
          },
        });

        // Nếu user có SP, tự động đóng góp SP của họ cho clan
        if (userSp > 0) {
          await tx.clanSpContribution.upsert({
            where: { userId: joinRequest.userId },
            create: {
              clanId: clan.id,
              userId: joinRequest.userId,
              spPledged: userSp,
            },
            update: {
              clanId: clan.id,
              spPledged: userSp,
            },
          });
        }

        await tx.clanJoinRequest.delete({ where: { id: requestId } });
      });

      await syncAndGetClanSp(clan.id);
      clearLeaderboardCache();

      return NextResponse.json({ success: true, message: 'Đã chấp thuận thành viên vào Clan.' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi xử lý đơn gia nhập.');
  }
}
