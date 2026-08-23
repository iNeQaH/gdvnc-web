import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    const { title, content, userId } = body;

    if (!title || !content || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const helpReq = await prisma.helpRequest.create({
      data: {
        userId,
        title,
        content
      }
    });

    return NextResponse.json({ success: true, data: helpReq });
  } catch (error: any) {
    console.error('Help create error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
