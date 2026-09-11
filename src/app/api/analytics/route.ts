import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) || '127.0.0.1';
    const rl = rateLimit(`analytics:${ip}`, 60, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ success: false }, { status: 429 });
    }

    const { path } = await req.json();
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const userAgent = req.headers.get('user-agent') || '';
    
    // Anonymize IP by hashing it with a daily salt to respect privacy while allowing unique visitor counts
    const today = new Date().toISOString().split('T')[0];
    const ipHash = crypto.createHash('sha256').update(ip + today).digest('hex').substring(0, 16);

    await prisma.pageVisit.create({
      data: {
        path: path.substring(0, 200),
        ipHash,
        userAgent: userAgent.substring(0, 255),
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silent fail for analytics
    return NextResponse.json({ success: false });
  }
}
