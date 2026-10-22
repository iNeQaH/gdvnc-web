import { isBrowserSameOriginFetch } from '@/lib/origin';
import { publicApiError } from '@/lib/apiError';
import { requireSuperAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try { await requireSuperAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const body = await req.json();

    if (body.direction === 'up' || body.direction === 'down') {
      const current = await prisma.badge.findUnique({ where: { id } });
      if (!current) return NextResponse.json({ error: 'Không tìm thấy huy hiệu.' }, { status: 404 });

      const neighbor = await prisma.badge.findFirst({
        where: body.direction === 'up'
          ? { sortOrder: { lt: current.sortOrder } }
          : { sortOrder: { gt: current.sortOrder } },
        orderBy: { sortOrder: body.direction === 'up' ? 'desc' : 'asc' },
      });

      if (neighbor) {
        await prisma.$transaction([
          prisma.badge.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } }),
          prisma.badge.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
        ]);
      }
      const badges = await prisma.badge.findMany({
        include: { badgeCategory: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      return NextResponse.json({ success: true, badges });
    }

    let parsedSortOrder: number | undefined = undefined;
    if (body.sortOrder !== undefined && body.sortOrder !== null && body.sortOrder !== '') {
      const val = parseInt(body.sortOrder, 10);
      if (!isNaN(val)) parsedSortOrder = val;
    }

    const hasGlow = body.effect === 'glow' || (body.effect !== 'none' && Boolean(body.glow));
    let nextGlowColor = undefined;
    if (body.effect !== undefined || body.glow !== undefined || body.glowColor !== undefined) {
      if (body.effect === 'none') {
        nextGlowColor = null;
      } else if (hasGlow) {
        nextGlowColor = body.glowColor || body.color2 || body.color || null;
      } else {
        nextGlowColor = null;
      }
    }

    const badge = await prisma.badge.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? body.description : undefined,
        icon: body.imageUrl !== undefined ? body.imageUrl || 'star' : undefined,
        color: body.color !== undefined ? body.color : undefined,
        color2: body.color2 !== undefined ? (body.color2 || null) : undefined,
        effect: body.effect !== undefined ? body.effect : undefined,
        glowColor: nextGlowColor,
        categoryId: body.categoryId !== undefined ? (body.categoryId || null) : undefined,
        sortOrder: parsedSortOrder,
      },
      include: { badgeCategory: true },
    });
    return NextResponse.json({ success: true, badge });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi cập nhật huy hiệu', 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try { await requireSuperAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const current = await prisma.badge.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy huy hiệu.' }, { status: 404 });
    if (current.systemKey) {
      return NextResponse.json({ error: 'Không thể xoá Role hệ thống. Bạn chỉ có thể tuỳ chỉnh màu sắc, tên và thứ tự hiển thị.' }, { status: 400 });
    }
    await prisma.badge.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi xóa huy hiệu', 500);
  }
}
