import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const helps = await prisma.helpRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    return NextResponse.json(helps);
  } catch (error: any) {
    console.error('Admin helps GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await prisma.helpRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
