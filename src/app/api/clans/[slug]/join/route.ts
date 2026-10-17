import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { syncAndGetClanSp } from '@/lib/clan';
import { clipText } from '@/lib/validate';
import { publicApiError } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
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
        members: { select: { userId: true } },
      },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const synced = await syncAndGetClanSp(clan.id);
    if (synced?.isSuspended) {
      return NextResponse.json(
        { error: 'Clan đang tạm ngưng hoạt động do thiếu SP coin, không thể nhận thêm thành viên.' },
        { status: 400 }
      );
    }

    if (synced && synced.memberCount >= synced.maxMembers) {
      return NextResponse.json(
        { error: `Clan đã đạt giới hạn tối đa ${synced.maxMembers} thành viên của ${synced.tierName}.` },
        { status: 400 }
      );
    }

    // Kiểm tra xem người dùng đã thuộc clan nào chưa
    const existing = await prisma.clanMember.findUnique({
      where: { userId: auth.userId },
      include: { clan: { select: { name: true, tag: true } } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Bạn đã tham gia Clan [${existing.clan.tag}] ${existing.clan.name}. Cần rời clan cũ trước.` },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const message = clipText(body.message, 200)?.trim() || null;

    const request = await prisma.clanJoinRequest.upsert({
      where: {
        clanId_userId: {
          clanId: clan.id,
          userId: auth.userId,
        },
      },
      create: {
        clanId: clan.id,
        userId: auth.userId,
        message,
        status: 'PENDING',
      },
      update: {
        message,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi gửi đơn xin gia nhập.');
  }
}
