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

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, supporterUntil: true },
    });
    const maxSp = calculateUserSp(user);
    if (maxSp <= 0) {
      return NextResponse.json(
        { error: 'Bạn hiện không có SP Coin nào (cần có gói Supporter còn hạn).' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const amount = parseInt(String(body.amount ?? maxSp), 10);
    if (isNaN(amount) || amount < 0 || amount > maxSp) {
      return NextResponse.json(
        { error: `Số điểm SP Coin phải từ 0 đến ${maxSp}.` },
        { status: 400 }
      );
    }

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

    const synced = await syncAndGetClanSp(clan.id);

    return NextResponse.json({
      success: true,
      message: `Đã đóng góp ${amount} SP Coin cho Clan.`,
      clanSp: synced,
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi quyên góp SP Coin.');
  }
}
