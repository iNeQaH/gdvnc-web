import { requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

const SUPER_ADMIN = 'iNeQaH';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let actorJwt;
  try { actorJwt = await requireFullAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { newRole, grantSupporterMonths } = await req.json();

    if (!grantSupporterMonths && !['USER', 'MODERATOR', 'ADMIN'].includes(newRole)) {
      return NextResponse.json({ error: 'Quyền (Role) không hợp lệ.' }, { status: 400 });
    }

    // Verify current performing admin
    const actor = await prisma.user.findUnique({
      where: { id: actorJwt.userId },
    });

    if (!actor || (actor.role !== Role.ADMIN && actor.username !== SUPER_ADMIN)) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
    }

    // Find target user
    const target = await prisma.user.findUnique({
      where: { id },
    });

    if (!target) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    // Rule 1: Nobody can touch iNeQaH
    if (target.username === SUPER_ADMIN) {
      return NextResponse.json({ error: 'Không thể thay đổi quyền của Super Admin (iNeQaH).' }, { status: 403 });
    }

    // Rule 2: If target is currently an ADMIN, ONLY iNeQaH can change/demote them
    if (!grantSupporterMonths && target.role === Role.ADMIN && target.id !== actor.id) {
      if (actor.username !== SUPER_ADMIN) {
        return NextResponse.json({
          error: 'Admin không thể gỡ quyền của một Admin khác. Chỉ Super Admin (iNeQaH) mới có quyền này.',
        }, { status: 403 });
      }
    }

    // Update role
    let updatedData: { role?: Role; supporterUntil?: Date | null } = {};
    if (grantSupporterMonths) {
      const months = parseInt(String(grantSupporterMonths), 10);
      if (!Number.isFinite(months) || months === 0) {
        return NextResponse.json({ error: 'Số tháng Supporter không hợp lệ.' }, { status: 400 });
      }
      if (months < 0) {
        updatedData.supporterUntil = null;
      } else {
        const now = new Date();
        const current = target.supporterUntil;
        const base = current && current > now ? current : now;
        const next = new Date(base.getTime());
        next.setMonth(next.getMonth() + months);
        updatedData.supporterUntil = next;
      }
    } else {
      updatedData.role = newRole as Role;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updatedData,
      select: {
        id: true,
        username: true,
        role: true,
        supporterUntil: true,
      },
    });

    // Create notification for target user
    if (grantSupporterMonths) {
      const months = parseInt(grantSupporterMonths);
      if (months > 0) {
        await prisma.notification.create({
          data: {
            userId: target.id,
            title: 'Cấp Quyền Supporter',
            message: `Bạn vừa được Admin "${actor.username}" cấp ${months} tháng Supporter! Cảm ơn bạn đã đồng hành cùng cộng đồng GDVN.`,
          },
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: target.id,
            title: 'Hết Hạn Supporter',
            message: `Quyền Supporter của bạn đã được cập nhật bởi Admin "${actor.username}".`,
          },
        });
      }
    } else if (newRole && newRole !== target.role) {
      const roleName = newRole === 'ADMIN' ? 'Quản Trị Viên (Admin)' : newRole === 'MODERATOR' ? 'Kiểm Duyệt Viên (Moderator)' : 'Thành Viên (User)';
      await prisma.notification.create({
        data: {
          userId: target.id,
          title: 'Cập Nhật Vai Trò',
          message: `Vai trò tài khoản của bạn đã được Admin "${actor.username}" cập nhật thành: ${roleName}.`,
        },
      });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật quyền.' }, { status: 500 });
  }
}
