import { requireAdmin, requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    let categories = await prisma.badgeCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    if (categories.length === 0) {
      await prisma.badgeCategory.createMany({
        data: [
          { name: 'Deco', description: 'Huy hiệu deco / rate', sortOrder: 1 },
          { name: 'Layout', description: 'Huy hiệu layout / VLC', sortOrder: 2 },
          { name: 'Player', description: 'Huy hiệu người chơi', sortOrder: 3 },
          { name: 'Event', description: 'Huy hiệu sự kiện', sortOrder: 4 },
        ],
      });
      categories = await prisma.badgeCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    }

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try { await requireFullAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { name, description } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Tên phân loại là bắt buộc.' }, { status: 400 });
    }

    const last = await prisma.badgeCategory.findFirst({ orderBy: { sortOrder: 'desc' } });
    const category = await prisma.badgeCategory.create({
      data: {
        name: name.trim(),
        description: description || null,
        sortOrder: (last?.sortOrder || 0) + 1,
      },
    });
    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tạo phân loại' }, { status: 500 });
  }
}
