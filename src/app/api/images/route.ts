import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // await requireAuth();
    const { dataUrl } = await req.json();

    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const image = await (prisma as any).image.create({
      data: { dataUrl },
    });

    return NextResponse.json({ success: true, url: `/api/images/${image.id}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
