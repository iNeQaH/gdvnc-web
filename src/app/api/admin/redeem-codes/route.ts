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
    const months = parseInt(body?.months, 10);
    const maxUses = body?.maxUses !== undefined ? parseInt(body.maxUses, 10) : 1;

    if (!rawCode) {
      return NextResponse.json({ error: 'Vui lòng nhập mã code.' }, { status: 400 });
    }

    if (rawCode.length < 3 || rawCode.length > 50) {
      return NextResponse.json({ error: 'Mã code phải có độ dài từ 3 đến 50 ký tự.' }, { status: 400 });
    }

    const code = rawCode.toUpperCase();

    if (isNaN(months) || months < 1 || months > 120) {
      return NextResponse.json({ error: 'Số tháng phải là số nguyên từ 1 đến 120 (tối đa 10 năm).' }, { status: 400 });
    }

    if (isNaN(maxUses) || maxUses < 1 || maxUses > 10000) {
      return NextResponse.json({ error: 'Số lượt sử dụng phải là số nguyên từ 1 đến 10,000.' }, { status: 400 });
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
        months,
        maxUses,
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
