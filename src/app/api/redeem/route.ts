import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { publicApiError } from '@/lib/apiError';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { calculateUserSp } from '@/lib/clanTypes';

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
      select: { id: true, username: true, supporterUntil: true, role: true, profileConfig: true, profileTheme: true, hasGlitchTheme: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại.' }, { status: 404 });
    }

    const now = new Date();
    const isGlitchTheme = redeemCode.rewardType === 'GLITCH_THEME';
    const isSpCoin = redeemCode.rewardType === 'SP_COIN';

    if (isGlitchTheme) {
      const updatedUser = await prisma.$transaction(async (tx) => {
        const claimed = await tx.redeemCode.updateMany({
          where: {
            id: redeemCode.id,
            isActive: true,
            ...(isUnlimited || redeemCode.maxUses === null ? {} : { usedCount: { lt: redeemCode.maxUses } }),
          },
          data: {
            usedCount: { increment: 1 },
          },
        });
        if (claimed.count === 0) {
          throw new Error('CODE_EXHAUSTED');
        }

        if (!isUnlimited && redeemCode.maxUses !== null && redeemCode.usedCount + 1 >= redeemCode.maxUses) {
          await tx.redeemCode.updateMany({
            where: { id: redeemCode.id, usedCount: { gte: redeemCode.maxUses } },
            data: { isActive: false },
          });
        }

        await tx.redeemCodeUse.create({
          data: {
            codeId: redeemCode.id,
            userId: user.id,
            months: 0,
            rewardType: 'GLITCH_THEME',
            days: 0,
            spAmount: 0,
          },
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Mở khoá Theme lỗi thành công',
            message: `Bạn đã kích hoạt mã bí mật "${redeemCode.code}" và mở khoá vĩnh viễn giao diện ẩn "Theme lỗi" cho trang hồ sơ cá nhân!`,
          },
        });

        const updated = await tx.user.update({
          where: { id: user.id },
          data: {
            hasGlitchTheme: true,
            profileTheme: 'glitch',
          },
          select: {
            id: true,
            username: true,
            supporterUntil: true,
            spPoints: true,
            role: true,
            profileConfig: true,
            profileTheme: true,
            hasGlitchTheme: true,
            spGrants: {
              select: { id: true, amount: true, expiresAt: true, reason: true },
            },
          },
        });

        return updated;
      });

      return NextResponse.json({
        success: true,
        rewardType: 'GLITCH_THEME',
        user: {
          ...updatedUser,
          userSp: calculateUserSp(updatedUser),
        },
        message: 'Đã mở khoá và kích hoạt "Theme lỗi" cho trang hồ sơ của bạn!',
      });
    }

    if (isSpCoin) {
      const spAmount = redeemCode.spAmount > 0 ? redeemCode.spAmount : 1;
      const isSupporter = Boolean(user.supporterUntil && new Date(user.supporterUntil) > now);
      const expiresAt = isSupporter
        ? new Date(user.supporterUntil!)
        : new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000);
      const formattedExpiresDate = isSupporter ? expiresAt.toLocaleDateString('vi-VN') : null;

      const updatedUser = await prisma.$transaction(async (tx) => {
        // 1. Atomically increment code usedCount only if still active and under maxUses
        const claimed = await tx.redeemCode.updateMany({
          where: {
            id: redeemCode.id,
            isActive: true,
            ...(isUnlimited || redeemCode.maxUses === null ? {} : { usedCount: { lt: redeemCode.maxUses } }),
          },
          data: {
            usedCount: { increment: 1 },
          },
        });
        if (claimed.count === 0) {
          throw new Error('CODE_EXHAUSTED');
        }

        if (!isUnlimited && redeemCode.maxUses !== null && redeemCode.usedCount + 1 >= redeemCode.maxUses) {
          await tx.redeemCode.updateMany({
            where: { id: redeemCode.id, usedCount: { gte: redeemCode.maxUses } },
            data: { isActive: false },
          });
        }

        // 2. Create SP Grant for user (đồng bộ thời hạn Supporter)
        await tx.userSpGrant.create({
          data: {
            userId: user.id,
            amount: spAmount,
            expiresAt,
            reason: `REDEEM_CODE:${redeemCode.code}`,
          },
        });

        // 3. Record code usage
        await tx.redeemCodeUse.create({
          data: {
            codeId: redeemCode.id,
            userId: user.id,
            months: 0,
            rewardType: 'SP_COIN',
            days: 0,
            spAmount,
          },
        });

        // 4. Send notification to user (no emoji)
        const notifMsg = isSupporter
          ? `Bạn đã đổi thành công mã "${redeemCode.code}". Tài khoản của bạn được cộng +${spAmount} điểm SP Coin dùng để duy trì hoặc nâng cấp Clan (hiệu lực theo thời hạn Supporter đến ngày ${formattedExpiresDate}). Cảm ơn bạn đã đồng hành cùng GDVN!`
          : `Bạn đã đổi thành công mã "${redeemCode.code}". Tài khoản của bạn được cộng +${spAmount} điểm SP Coin dùng để duy trì hoặc nâng cấp Clan (sẽ có hiệu lực khi bạn sở hữu danh hiệu Supporter). Cảm ơn bạn đã đồng hành cùng GDVN!`;

        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Nhận SP Coin thành công',
            message: notifMsg,
          },
        });

        // 5. Update user spPoints and fetch updated user with grants
        const updated = await tx.user.update({
          where: { id: user.id },
          data: {
            spPoints: { increment: spAmount },
          },
          select: {
            id: true,
            username: true,
            supporterUntil: true,
            spPoints: true,
            role: true,
            profileConfig: true,
            profileTheme: true,
            spGrants: {
              select: { id: true, amount: true, expiresAt: true, reason: true },
            },
          },
        });

        return updated;
      });

      return NextResponse.json({
        success: true,
        rewardType: 'SP_COIN',
        spAmount,
        expiresAt: expiresAt.toISOString(),
        user: {
          ...updatedUser,
          userSp: calculateUserSp(updatedUser),
        },
        message: isSupporter
          ? `Đổi mã thành công! Bạn nhận được +${spAmount} SP Coin (tồn tại theo thời hạn Supporter của bạn).`
          : `Đổi mã thành công! Bạn nhận được +${spAmount} SP Coin (hiệu lực đồng thời khi kích hoạt Supporter).`,
      });
    }

    // Gói số ngày Supporter (SUPPORTER_DAYS)
    const daysToGrant = redeemCode.days > 0 ? redeemCode.days : (redeemCode.months > 0 ? redeemCode.months * 30 : 30);
    const currentUntil = user.supporterUntil;
    const baseDate = currentUntil && new Date(currentUntil) > now ? new Date(currentUntil) : now;
    const nextDate = new Date(baseDate.getTime() + daysToGrant * 24 * 60 * 60 * 1000);
    const formattedDate = nextDate.toLocaleDateString('vi-VN');

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Atomically increment code usedCount only if still active and under maxUses
      const claimed = await tx.redeemCode.updateMany({
        where: {
          id: redeemCode.id,
          isActive: true,
          ...(isUnlimited || redeemCode.maxUses === null ? {} : { usedCount: { lt: redeemCode.maxUses } }),
        },
        data: {
          usedCount: { increment: 1 },
        },
      });
      if (claimed.count === 0) {
        throw new Error('CODE_EXHAUSTED');
      }

      if (!isUnlimited && redeemCode.maxUses !== null && redeemCode.usedCount + 1 >= redeemCode.maxUses) {
        await tx.redeemCode.updateMany({
          where: { id: redeemCode.id, usedCount: { gte: redeemCode.maxUses } },
          data: { isActive: false },
        });
      }

      // 2. Update user supporter date
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { supporterUntil: nextDate },
        select: {
          id: true,
          username: true,
          supporterUntil: true,
          spPoints: true,
          role: true,
          profileConfig: true,
          profileTheme: true,
          spGrants: {
            select: { id: true, amount: true, expiresAt: true, reason: true },
          },
        },
      });

      // 2b. Đồng bộ thời hạn toàn bộ SP Coin hiện có theo hạn Supporter mới
      await tx.userSpGrant.updateMany({
        where: { userId: user.id },
        data: { expiresAt: nextDate },
      });

      // 3. Record code usage
      await tx.redeemCodeUse.create({
        data: {
          codeId: redeemCode.id,
          userId: user.id,
          months: Math.max(1, Math.round(daysToGrant / 30)),
          rewardType: 'SUPPORTER_DAYS',
          days: daysToGrant,
          spAmount: 0,
        },
      });

      // 4. Send notification to user (no emoji)
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Kích hoạt Supporter thành công',
          message: `Bạn đã đổi thành công mã "${redeemCode.code}". Tài khoản của bạn được cộng ${daysToGrant} ngày Supporter (có hiệu lực đến ngày ${formattedDate}). Cảm ơn bạn đã đồng hành cùng GDVN!`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      rewardType: 'SUPPORTER_DAYS',
      days: daysToGrant,
      months: Math.max(1, Math.round(daysToGrant / 30)),
      supporterUntil: nextDate.toISOString(),
      user: {
        ...updatedUser,
        userSp: calculateUserSp(updatedUser),
      },
      message: `Kích hoạt thành công ${daysToGrant} ngày Supporter!`,
    });
  } catch (error: any) {
    if (error?.message === 'CODE_EXHAUSTED') {
      return NextResponse.json({ error: 'Mã đổi thưởng này vừa hết lượt sử dụng.' }, { status: 400 });
    }
    return publicApiError(error, 'Đã xảy ra lỗi khi kích hoạt mã đổi thưởng.', 500);
  }
}
