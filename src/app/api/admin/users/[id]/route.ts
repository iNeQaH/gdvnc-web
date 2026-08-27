import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

const SUPER_ADMIN = 'iNeQaH';

export async function DELETE(req: Request, context: any) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const params = await context.params;
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const currentAdminUsername = body?.currentAdminUsername as string | undefined;

    if (!currentAdminUsername) {
      return NextResponse.json({ error: 'Thiếu thông tin admin.' }, { status: 400 });
    }

    const actor = await prisma.user.findUnique({ where: { username: currentAdminUsername } });
    if (!actor || (actor.role !== Role.ADMIN && actor.username !== SUPER_ADMIN)) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return NextResponse.json({ error: 'User không tồn tại' }, { status: 404 });

    if (targetUser.username === SUPER_ADMIN) {
      return NextResponse.json({ error: 'Không thể xoá Super Admin.' }, { status: 403 });
    }

    if (targetUser.role === Role.ADMIN && actor.username !== SUPER_ADMIN && actor.id !== targetUser.id) {
      return NextResponse.json({ error: 'Chỉ Super Admin mới có thể xoá tài khoản Admin khác.' }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.record.updateMany({
        where: { userId: id },
        data: {
          userId: null,
          legacyPlayerName: targetUser.gdUsername || targetUser.username,
        },
      }),
      prisma.record.updateMany({ where: { reviewerId: id }, data: { reviewerId: null } }),
      prisma.creatorWork.updateMany({ where: { reviewerId: id }, data: { reviewerId: null } }),
      prisma.levelSubmission.updateMany({ where: { reviewerId: id }, data: { reviewerId: null } }),
      prisma.level.updateMany({ where: { creatorId: id }, data: { creatorId: null } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, message: 'Đã xóa người dùng thành công.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
