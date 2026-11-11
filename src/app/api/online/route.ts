import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

let cachedOnlineCount = 1;
let lastCheckTime = 0;

export async function GET() {
  try {
    const now = Date.now();
    if (now - lastCheckTime < 10_000) {
      return NextResponse.json({ success: true, onlineUsers: cachedOnlineCount });
    }

    const fiveMinsAgo = new Date(now - 5 * 60 * 1000);
    const onlineVisits = await prisma.pageVisit.findMany({
      where: { createdAt: { gte: fiveMinsAgo } },
      distinct: ['ipHash'],
      select: { ipHash: true },
    });

    cachedOnlineCount = Math.max(1, onlineVisits.length);
    lastCheckTime = now;

    return NextResponse.json({ success: true, onlineUsers: cachedOnlineCount });
  } catch (error) {
    return NextResponse.json({ success: true, onlineUsers: Math.max(1, cachedOnlineCount) });
  }
}
