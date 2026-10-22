import { isBrowserSameOriginFetch } from '@/lib/origin';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit } from '@/lib/rateLimit';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: Request) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const ip = getClientIp(req) || '127.0.0.1';
    const rl = rateLimit(`analytics:${ip}`, 60, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ success: false }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const rawPath = typeof body?.path === 'string' ? body.path : '/';
    const isHeartbeat = Boolean(body?.heartbeat);
    const userAgent = req.headers.get('user-agent') || '';

    // Identify visitor: by logged-in user if authenticated, otherwise by anonymized IP
    const authUser = await getAuthUser().catch(() => null);
    let ipHash: string;
    if (authUser?.userId) {
      ipHash = `usr_${authUser.userId}`;
    } else {
      const salt = process.env.JWT_SECRET || 'gdvn_visitor_salt';
      ipHash = `ip_${crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 16)}`;
    }

    // If it's a heartbeat, throttle to avoid DB bloat: only record if user hasn't been active in the last 2 minutes
    if (isHeartbeat) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const recentActivity = await prisma.pageVisit.findFirst({
        where: {
          ipHash,
          createdAt: { gte: twoMinutesAgo },
        },
        select: { id: true },
      });
      if (recentActivity) {
        return NextResponse.json({ success: true, throttled: true });
      }
    }

    const recordPath = isHeartbeat ? '__heartbeat__' : rawPath.substring(0, 200);

    await prisma.pageVisit.create({
      data: {
        path: recordPath,
        ipHash,
        userAgent: userAgent.substring(0, 255),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silent fail for analytics
    return NextResponse.json({ success: false });
  }
}
