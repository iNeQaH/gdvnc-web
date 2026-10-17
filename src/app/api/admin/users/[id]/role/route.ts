import { requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { isSuperAdminUser } from '@/lib/roles';
import { publicApiError } from '@/lib/apiError';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let actorJwt;
  try { actorJwt = await requireFullAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { newRole, grantSupporterMonths, setSupporterMonths } = await req.json();

    const isSupporterUpdate = grantSupporterMonths !== undefined || setSupporterMonths !== undefined;
    if (!isSupporterUpdate && !['USER', 'MODERATOR', 'ADMIN'].includes(newRole)) {
      return NextResponse.json({ error: 'Quyền (Role) không hợp lệ.' }, { status: 400 });
    }

    // Verify current performing admin
    const actor = await prisma.user.findUnique({
      where: { id: actorJwt.userId },
    });

    if (!actor || (actor.role !== Role.ADMIN && !isSuperAdminUser(actor))) {
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
    if (isSuperAdminUser(target) && !isSuperAdminUser(actor)) {
      return NextResponse.json({ error: 'Không thể thay đổi quyền của Super Admin.' }, { status: 403 });
    }

    // Rule 2: If target is currently an ADMIN, ONLY iNeQaH can change/demote them
    if (newRole && target.role === Role.ADMIN && target.id !== actor.id) {
      if (!isSuperAdminUser(actor)) {
        return NextResponse.json({
          error: 'Admin không thể gỡ quyền của một Admin khác. Chỉ Super Admin mới có quyền này.',
        }, { status: 403 });
      }
    }

    // Rule 3: Promoting a user to ADMIN requires Super Admin
    if (newRole === 'ADMIN' && target.role !== Role.ADMIN) {
      if (!isSuperAdminUser(actor)) {
        return NextResponse.json({
          error: 'Chỉ Super Admin mới có quyền phong vị trí Admin.',
        }, { status: 403 });
      }
    }

    // Update role and supporter
    let updatedData: { role?: Role; supporterUntil?: Date | null; tokenVersion?: { increment: number } } = {};
    let supporterMonthsVal: number | null = null;
    let isSupporterChanged = false;

    if (setSupporterMonths !== undefined) {
      const months = parseInt(String(setSupporterMonths), 10);
      if (!Number.isFinite(months) || months < 0) {
        return NextResponse.json({ error: 'Số tháng Supporter không hợp lệ.' }, { status: 400 });
      }
      isSupporterChanged = true;
      supporterMonthsVal = months;
      if (months === 0) {
        updatedData.supporterUntil = null;
      } else {
        const next = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
        updatedData.supporterUntil = next;
      }
    } else if (grantSupporterMonths !== undefined && grantSupporterMonths !== 0 && grantSupporterMonths !== '0') {
      const months = parseInt(String(grantSupporterMonths), 10);
      if (!Number.isFinite(months)) {
        return NextResponse.json({ error: 'Số tháng Supporter không hợp lệ.' }, { status: 400 });
      }
      isSupporterChanged = true;
      supporterMonthsVal = months;
      if (months < 0) {
        updatedData.supporterUntil = null;
      } else {
        const now = new Date();
        const current = target.supporterUntil;
        const base = current && current > now ? current : now;
        const next = new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000);
        updatedData.supporterUntil = next;
      }
    }

    if (newRole && ['USER', 'MODERATOR', 'ADMIN'].includes(newRole)) {
      updatedData.role = newRole as Role;
      if (newRole !== target.role) {
        updatedData.tokenVersion = { increment: 1 };
      }
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
    if (isSupporterChanged) {
      if (supporterMonthsVal && supporterMonthsVal > 0) {
        await prisma.notification.create({
          data: {
            userId: target.id,
            title: 'Cấp Quyền Supporter',
            message: `Bạn vừa được Admin "${actor.username}" cập nhật ${supporterMonthsVal} tháng Supporter! Cảm ơn bạn đã đồng hành cùng cộng đồng GDVN.`,
          },
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: target.id,
            title: 'Cập Nhật Supporter',
            message: `Quyền Supporter của bạn đã được cập nhật hoặc kết thúc bởi Admin "${actor.username}".`,
          },
        });
      }
    }

    if (newRole && newRole !== target.role) {
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
  } catch (error) {
    return publicApiError(error, 'Lỗi cập nhật quyền.');
  }
}

