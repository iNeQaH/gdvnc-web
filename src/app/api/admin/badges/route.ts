import { requireAdmin, requireSuperAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    let badges = await prisma.badge.findMany({
      include: { badgeCategory: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const orders = badges.map((b) => b.sortOrder);
    const uniqueCount = new Set(orders).size;
    if (badges.length > 1 && (uniqueCount !== badges.length || badges.every((b) => b.sortOrder === 0))) {
      await prisma.$transaction(
        badges.map((b, i) =>
          prisma.badge.update({ where: { id: b.id }, data: { sortOrder: i + 1 } })
        )
      );
      badges = await prisma.badge.findMany({
        include: { badgeCategory: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    }

    return NextResponse.json({ success: true, badges });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try { await requireSuperAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { name, description, imageUrl, color, glow, categoryId, sortOrder } = await req.json();
    if (!name) return NextResponse.json({ error: 'Tên huy hiệu là bắt buộc.' }, { status: 400 });

    const last = await prisma.badge.findFirst({ orderBy: { sortOrder: 'desc' } });
    let parsedSortOrder = (last?.sortOrder || 0) + 1;
    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
      const val = parseInt(sortOrder, 10);
      if (!isNaN(val)) parsedSortOrder = val;
    }

    const badge = await prisma.badge.create({
      data: {
        name,
        description,
        icon: imageUrl || 'star',
        color: color || '#FFD700',
        glowColor: glow ? color || '#FFD700' : null,
        categoryId: categoryId || null,
        sortOrder: parsedSortOrder,
      },
      include: { badgeCategory: true },
    });
    return NextResponse.json({ success: true, badge });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tạo huy hiệu' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try { await requireSuperAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { orderedIds } = await req.json();
    if (!Array.isArray(orderedIds)) return NextResponse.json({ error: 'Mảng ID không hợp lệ' }, { status: 400 });
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) => 
        prisma.badge.update({ where: { id }, data: { sortOrder: index + 1 } })
      )
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
