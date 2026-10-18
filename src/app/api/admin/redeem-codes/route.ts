import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { publicApiError } from '@/lib/apiError';

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const codes = await prisma.redeemCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, username: true },
        },
        usages: {
          orderBy: { redeemedAt: 'desc' },
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, codes });
  } catch (error) {
    return publicApiError(error, 'Không thể tải danh sách Redeem Code.', 500);
  }
}

export async function POST(req: Request) {
  let adminUser;
  try {
    adminUser = await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    let rawCode = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!rawCode) {
      return NextResponse.json({ error: 'Vui lòng nhập mã code.' }, { status: 400 });
    }

    if (rawCode.length < 3 || rawCode.length > 50) {
      return NextResponse.json({ error: 'Mã code phải có độ dài từ 3 đến 50 ký tự.' }, { status: 400 });
    }

    const code = rawCode.toUpperCase();

    const rewardType = body?.rewardType === 'SP_COIN' ? 'SP_COIN' : 'SUPPORTER_DAYS';
    let days = 30;
    let months = 1;
    let spAmount = 0;

    if (rewardType === 'SP_COIN') {
      spAmount = parseInt(body?.spAmount, 10);
      if (isNaN(spAmount) || spAmount < 1 || spAmount > 10000) {
        return NextResponse.json({ error: 'Số lượng SP Coin phải từ 1 đến 10,000.' }, { status: 400 });
      }
      days = 30;
      months = 0;
    } else {
      if (body?.days !== undefined && body?.days !== null && body?.days !== '') {
        days = parseInt(body.days, 10);
      } else if (body?.months !== undefined && body?.months !== null && body?.months !== '') {
        days = parseInt(body.months, 10) * 30;
      }
      if (isNaN(days) || days < 1 || days > 36500) {
        return NextResponse.json({ error: 'Số ngày Supporter phải từ 1 đến 36,500 ngày (tối đa 100 năm).' }, { status: 400 });
      }
      months = Math.max(1, Math.round(days / 30));
    }

    let maxUses: number | null = null;
    if (
      body?.maxUses === null ||
      body?.maxUses === undefined ||
      body?.maxUses === '' ||
      body?.maxUses === 0 ||
      body?.maxUses === 'all' ||
      body?.maxUses === 'unlimited'
    ) {
      maxUses = null;
    } else {
      const parsedUses = parseInt(body.maxUses, 10);
      if (isNaN(parsedUses) || parsedUses < 1 || parsedUses > 1000000) {
        return NextResponse.json({ error: 'Số người dùng phải là số nguyên từ 1 trở lên hoặc để trống cho toàn bộ người dùng.' }, { status: 400 });
      }
      maxUses = parsedUses;
    }

    const expiresInDays = body?.expiresInDays !== undefined && body?.expiresInDays !== null && body?.expiresInDays !== ''
      ? parseInt(body.expiresInDays, 10)
      : null;
    let expiresAt: Date | null = null;
    if (expiresInDays !== null && !isNaN(expiresInDays) && expiresInDays > 0) {
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    } else if (body?.expiresAt) {
      const parsed = new Date(body.expiresAt);
      if (!isNaN(parsed.getTime())) {
        expiresAt = parsed;
      }
    }

    const existing = await prisma.redeemCode.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json({ error: `Mã code "${code}" đã tồn tại trên hệ thống.` }, { status: 400 });
    }

    const created = await prisma.redeemCode.create({
      data: {
        code,
        rewardType,
        days,
        months,
        spAmount,
        maxUses,
        expiresAt,
        createdById: adminUser.userId,
      },
      include: {
        createdBy: {
          select: { id: true, username: true },
        },
        usages: true,
      },
    });

    return NextResponse.json({ success: true, code: created });
  } catch (error) {
    return publicApiError(error, 'Không thể tạo Redeem Code.', 500);
  }
}
