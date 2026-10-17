import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { syncAndGetClanSp } from '@/lib/clan';
import { isSuperAdminUser } from '@/lib/roles';
import { publicApiError } from '@/lib/apiError';

export async function DELETE(
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
    const { slug, id: targetMemberId } = await params;
    const clan = await prisma.clan.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        members: { where: { userId: auth.userId } },
      },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const target = await prisma.clanMember.findUnique({
      where: { id: targetMemberId },
    });
    if (!target || target.clanId !== clan.id) {
      return NextResponse.json({ error: 'Không tìm thấy thành viên trong Clan.' }, { status: 404 });
    }

    const currentMember = clan.members[0];
    const isSelf = target.userId === auth.userId;
    const isClanLeader = currentMember?.role === 'LEADER';
    const isClanMod = currentMember?.role === 'MODERATOR';
    const isOwner = isSuperAdminUser(auth);

    if (target.role === 'LEADER') {
      return NextResponse.json(
        { error: 'Leader không thể tự rời Clan. Vui lòng chuyển giao quyền Leader hoặc giải tán Clan.' },
        { status: 400 }
      );
    }

    // Kiểm tra quyền hạn trục xuất
    if (!isSelf) {
      if (!isClanLeader && !isOwner) {
        if (!isClanMod || target.role === 'MODERATOR') {
          return NextResponse.json(
            { error: 'Bạn không có quyền trục xuất thành viên này.' },
            { status: 403 }
          );
        }
      }
    }

    // Kiểm tra số SP coin thành viên đã đóng góp để hoàn lại
    const targetContrib = await prisma.clanSpContribution.findFirst({
      where: { clanId: clan.id, userId: target.userId },
    });
    const refundedSp = targetContrib?.spPledged || 0;

    // Xoá thành viên và xoá phần đóng góp SP coin của họ khỏi Clan (tự động rút toàn bộ SP)
    await prisma.$transaction(async (tx) => {
      await tx.clanMember.delete({
        where: { id: targetMemberId },
      });
      await tx.clanSpContribution.deleteMany({
        where: {
          clanId: clan.id,
          userId: target.userId,
        },
      });
    });

    // Cập nhật lại SP của Clan sau khi thành viên rời
    await syncAndGetClanSp(clan.id);

    // Gửi thông báo nếu có SP coin được hoàn lại
    if (refundedSp > 0) {
      try {
        await prisma.notification.create({
          data: {
            userId: target.userId,
            title: isSelf ? 'Rời Clan & Hoàn SP Coin' : 'Rút SP Coin Khi Rời Clan',
            message: `Bạn đã rời khỏi Clan "${clan.name}". Toàn bộ ${refundedSp} SP Coin bạn từng đóng góp đã được tự động hoàn trả về tài khoản của bạn.`,
          },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: isSelf
        ? (refundedSp > 0
            ? `Đã rời khỏi Clan và tự động hoàn trả ${refundedSp} SP Coin về tài khoản.`
            : 'Đã rời khỏi Clan.')
        : (refundedSp > 0
            ? `Đã trục xuất thành viên và tự động hoàn trả ${refundedSp} SP Coin cho họ.`
            : 'Đã trục xuất thành viên.'),
      refundedSp,
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi rời hoặc trục xuất thành viên.');
  }
}
