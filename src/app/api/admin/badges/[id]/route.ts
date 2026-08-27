import { requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireFullAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

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

    const badge = await prisma.badge.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? body.description : undefined,
        icon: body.imageUrl !== undefined ? body.imageUrl || 'star' : undefined,
        color: body.color !== undefined ? body.color : undefined,
        glowColor: body.glow !== undefined ? (body.glow ? body.color : null) : undefined,
        categoryId: body.categoryId !== undefined ? (body.categoryId || null) : undefined,
        sortOrder: parsedSortOrder,
      },
      include: { badgeCategory: true },
    });
    return NextResponse.json({ success: true, badge });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật huy hiệu' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireFullAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    await prisma.badge.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xóa huy hiệu' }, { status: 500 });
  }
}
