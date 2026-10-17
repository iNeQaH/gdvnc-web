import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { publicApiError } from '@/lib/apiError';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập để sử dụng tính năng này.' }, { status: 401 });
  }

  // Rate limit: 6 attempts per 5 minutes per user/IP
  const limited = rateLimit(`redeem:${auth.userId}:${getClientIp(req)}`, 6, 5 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!rawCode) {
      return NextResponse.json({ error: 'Vui lòng nhập mã đổi thưởng.' }, { status: 400 });
    }

    const code = rawCode.toUpperCase();

    const redeemCode = await prisma.redeemCode.findUnique({
      where: { code },
    });

    if (!redeemCode) {
      return NextResponse.json({ error: 'Mã đổi thưởng không chính xác hoặc không tồn tại.' }, { status: 404 });
    }

    if (!redeemCode.isActive) {
      return NextResponse.json({ error: 'Mã đổi thưởng này đã bị vô hiệu hóa.' }, { status: 400 });
    }

    if (redeemCode.expiresAt && new Date(redeemCode.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Mã đổi thưởng này đã hết hạn sử dụng.' }, { status: 400 });
    }

    const isUnlimited = redeemCode.maxUses === null || redeemCode.maxUses === 0;
    if (!isUnlimited && redeemCode.maxUses !== null && redeemCode.usedCount >= redeemCode.maxUses) {
      return NextResponse.json({ error: 'Mã đổi thưởng này đã hết lượt sử dụng.' }, { status: 400 });
    }

    // Check if user already used this code
    const alreadyUsed = await prisma.redeemCodeUse.findUnique({
      where: {
        codeId_userId: {
          codeId: redeemCode.id,
          userId: auth.userId,
        },
      },
    });

    if (alreadyUsed) {
      return NextResponse.json({ error: 'Bạn đã kích hoạt mã đổi thưởng này trước đó rồi.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true, supporterUntil: true, role: true, profileConfig: true, profileTheme: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại.' }, { status: 404 });
    }

    const now = new Date();
    const currentUntil = user.supporterUntil;
    const baseDate = currentUntil && new Date(currentUntil) > now ? new Date(currentUntil) : now;
    const nextDate = new Date(baseDate.getTime() + redeemCode.months * 30 * 24 * 60 * 60 * 1000);

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Update user supporter date
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { supporterUntil: nextDate },
        select: {
          id: true,
          username: true,
          supporterUntil: true,
          role: true,
          profileConfig: true,
          profileTheme: true,
        },
      });

      // 2. Increment code used count and toggle isActive if limit reached
      const newUsedCount = redeemCode.usedCount + 1;
      await tx.redeemCode.update({
        where: { id: redeemCode.id },
        data: {
          usedCount: { increment: 1 },
          isActive: isUnlimited ? true : newUsedCount < (redeemCode.maxUses ?? 1),
        },
      });

      // 3. Record code usage
      await tx.redeemCodeUse.create({
        data: {
          codeId: redeemCode.id,
          userId: user.id,
          months: redeemCode.months,
        },
      });

      // 4. Send notification to user
      const formattedDate = nextDate.toLocaleDateString('vi-VN');
      await tx.notification.create({
        data: {
          userId: user.id,
          title: '🎉 Kích hoạt Supporter thành công',
          message: `Bạn đã đổi thành công mã "${redeemCode.code}". Tài khoản của bạn được cộng ${redeemCode.months} tháng Supporter (có hiệu lực đến ngày ${formattedDate}). Cảm ơn bạn đã đồng hành cùng GDVN!`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      months: redeemCode.months,
      supporterUntil: nextDate.toISOString(),
      user: updatedUser,
      message: `Kích hoạt thành công ${redeemCode.months} tháng Supporter!`,
    });
  } catch (error) {
    return publicApiError(error, 'Đã xảy ra lỗi khi kích hoạt mã đổi thưởng.', 500);
  }
}
