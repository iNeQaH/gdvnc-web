import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clipText } from '@/lib/validate';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`helps:${auth.userId}`, 8, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = await req.json();
    const title = clipText(body.title, 160);
    const content = clipText(body.content, 4000);

    if (!title || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const helpReq = await prisma.helpRequest.create({
      data: {
        userId: auth.userId,
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
