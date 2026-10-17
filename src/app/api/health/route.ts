import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbOk = false;
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbOk = true;
  } catch (err: unknown) {
    dbOk = false;
  }

  const status = dbOk ? 200 : 503;
  return NextResponse.json(
    {
      status: dbOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        connected: dbOk,
        latencyMs: dbLatencyMs,
      },
      responseTimeMs: Date.now() - startTime,
    },
    { status }
  );
}
