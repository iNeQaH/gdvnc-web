import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateUserSp, syncAndGetClanSp } from '@/lib/clan';
import { publicApiError } from '@/lib/apiError';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
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
        members: { where: { userId: auth.userId } },
      },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const isMember = clan.members.length > 0;
    if (!isMember) {
      return NextResponse.json(
        { error: 'Bạn phải là thành viên của Clan mới có thể quyên góp SP Coin.' },
        { status: 403 }
      );
    }

    const existingContrib = await prisma.clanSpContribution.findFirst({
      where: { clanId: clan.id, userId: auth.userId },
    });
    const currentPledged = existingContrib?.spPledged || 0;

    const body = await req.json();

    // 1. Thao tác RÚT SP (Withdraw)
    if (body.action === 'withdraw') {
      const withdrawAmount = parseInt(String(body.amount ?? currentPledged), 10);
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return NextResponse.json({ error: 'Số SP Coin muốn rút không hợp lệ.' }, { status: 400 });
      }
      if (currentPledged <= 0) {
        return NextResponse.json({ error: 'Bạn chưa đóng góp SP Coin nào vào Clan này để rút.' }, { status: 400 });
      }
      if (withdrawAmount > currentPledged) {
        return NextResponse.json(
          { error: `Bạn chỉ có thể rút tối đa ${currentPledged} SP Coin đã đóng góp vào Clan.` },
          { status: 400 }
        );
      }

      const newPledged = currentPledged - withdrawAmount;
      if (newPledged <= 0) {
        await prisma.clanSpContribution.deleteMany({
          where: { clanId: clan.id, userId: auth.userId },
        });
      } else {
        await prisma.clanSpContribution.update({
          where: { userId: auth.userId },
          data: { spPledged: newPledged },
        });
      }

      const synced = await syncAndGetClanSp(clan.id);

      return NextResponse.json({
        success: true,
        message: `Đã rút thành công ${withdrawAmount} SP Coin từ Clan về tài khoản.`,
        myPledge: newPledged,
        clanSp: synced,
      });
    }

    // 2. Thao tác ĐÓNG GÓP / NÂNG CẤP SP (Donate / Adjust)
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        supporterUntil: true,
        spGrants: {
          select: { amount: true, expiresAt: true },
        },
      },
    });
    const maxSp = calculateUserSp(user);

    if (maxSp <= 0 && currentPledged <= 0) {
      return NextResponse.json(
        { error: 'Bạn hiện không có SP Coin nào (cần có gói Supporter hoặc SP Coin còn hạn).' },
        { status: 400 }
      );
    }

    const amount = parseInt(String(body.amount ?? maxSp), 10);
    if (isNaN(amount) || amount < 0 || amount > maxSp) {
      return NextResponse.json(
        { error: `Số điểm SP Coin phải từ 0 đến ${maxSp}.` },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      await prisma.clanSpContribution.deleteMany({
        where: { clanId: clan.id, userId: auth.userId },
      });
    } else {
      await prisma.clanSpContribution.upsert({
        where: { userId: auth.userId },
        create: {
          clanId: clan.id,
          userId: auth.userId,
          spPledged: amount,
        },
        update: {
          clanId: clan.id,
          spPledged: amount,
        },
      });
    }

    const synced = await syncAndGetClanSp(clan.id);

    return NextResponse.json({
      success: true,
      message: amount < currentPledged
        ? `Đã rút ${currentPledged - amount} SP Coin về tài khoản.`
        : `Đã đóng góp ${amount} SP Coin cho Clan thành công.`,
      myPledge: amount,
      clanSp: synced,
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi quyên góp SP Coin.');
  }
}
