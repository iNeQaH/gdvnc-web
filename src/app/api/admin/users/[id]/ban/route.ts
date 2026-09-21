import { requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperAdminUser } from '@/lib/roles';
import { publicApiError } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let actorJwt;
  try {
    actorJwt = await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const action = body?.action === 'unban' ? 'unban' : 'ban';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    const actor = await prisma.user.findUnique({
      where: { id: actorJwt.userId },
      select: { id: true, username: true, role: true },
    });

    if (!actor || actor.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, isBanned: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    // Rule 1: Cannot ban/unban Super Admin
    if (isSuperAdminUser(target)) {
      return NextResponse.json({ error: 'Không thể thay đổi trạng thái hoạt động của Super Admin.' }, { status: 403 });
    }

    // Rule 2: Cannot ban another Admin unless actor is Super Admin
    if (target.role === 'ADMIN' && target.id !== actor.id && !isSuperAdminUser(actor)) {
      return NextResponse.json({ error: 'Admin không thể đình chỉ một Admin khác. Chỉ Super Admin mới có quyền này.' }, { status: 403 });
    }

    if (action === 'ban') {
      const banReason = reason || 'Vi phạm quy định cộng đồng.';
      await prisma.user.update({
        where: { id: target.id },
        data: {
          isBanned: true,
          banReason,
          tokenVersion: { increment: 1 }, // Revoke active sessions immediately
        },
      });

      return NextResponse.json({
        success: true,
        isBanned: true,
        message: `Đã đình chỉ hoạt động tài khoản "${target.username}".`,
      });
    } else {
      await prisma.user.update({
        where: { id: target.id },
        data: {
          isBanned: false,
          banReason: null,
        },
      });

      await prisma.notification.create({
        data: {
          userId: target.id,
          title: 'Khôi Phục Tài Khoản',
          message: `Tài khoản của bạn đã được Admin "${actor.username}" gỡ đình chỉ hoạt động.`,
        },
      });

      return NextResponse.json({
        success: true,
        isBanned: false,
        message: `Đã khôi phục hoạt động cho tài khoản "${target.username}".`,
      });
    }
  } catch (error) {
    return publicApiError(error, 'Lỗi cập nhật trạng thái tài khoản.');
  }
}
