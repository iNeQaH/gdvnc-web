import { requireSuperAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { isSuperAdminUser } from '@/lib/roles';
import { publicApiError } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let actorJwt;
  try {
    actorJwt = await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Không có quyền thực hiện. Chỉ Super Admin mới có thể reset mật khẩu.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword.trim() : '';

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' }, { status: 400 });
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ error: 'Mật khẩu quá dài (tối đa 128 ký tự).' }, { status: 400 });
    }

    // Verify actor
    const actor = await prisma.user.findUnique({
      where: { id: actorJwt.userId },
      select: { id: true, username: true, role: true },
    });

    if (!actor || !isSuperAdminUser(actor)) {
      return NextResponse.json({ error: 'Chỉ Super Admin mới có quyền đổi mật khẩu người dùng.' }, { status: 403 });
    }

    // Find target user
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    // Hash new password and invalidate sessions
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: target.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    // Notify user about password reset
    await prisma.notification.create({
      data: {
        userId: target.id,
        title: 'Mật Khẩu Đã Được Đặt Lại',
        message: `Mật khẩu tài khoản của bạn đã được Super Admin "${actor.username}" đặt lại thành công.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã đổi mật khẩu cho tài khoản "${target.username}" thành công.`,
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi đặt lại mật khẩu.');
  }
}
