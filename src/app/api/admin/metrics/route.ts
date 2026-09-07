import { NextResponse } from 'next/server';
import os from 'os';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

let previousCpu = process.cpuUsage();
let previousTime = Date.now();

import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev) {
      await requireSuperAdmin();
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Calculate CPU usage %
  const currentCpu = process.cpuUsage();
  const currentTime = Date.now();
  
  const userDiff = currentCpu.user - previousCpu.user;
  const systemDiff = currentCpu.system - previousCpu.system;
  const timeDiff = currentTime - previousTime;
  
  const cpuPercent = ((userDiff + systemDiff) / 1000 / timeDiff) * 100;
  
  previousCpu = currentCpu;
  previousTime = currentTime;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memoryUsage = process.memoryUsage();
  
  // Get database metrics
  let dbSize = 0;
  try {
    const sizeResult: any[] = await prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`;
    if (sizeResult && sizeResult[0]) {
      dbSize = Number(sizeResult[0].size);
    }
  } catch (err) {
    // ignore
  }

  // Get today's traffic
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let pageViews = 0;
  let uniqueVisitors = 0;
  try {
    pageViews = await prisma.pageVisit.count({
      where: { createdAt: { gte: today } }
    });
    
    // Group by unique IP hash
    const unique = await prisma.pageVisit.groupBy({
      by: ['ipHash'],
      where: { createdAt: { gte: today } },
    });
    uniqueVisitors = unique.length;
  } catch (err) {
    // ignore if table doesn't exist yet
  }
  
  const metrics = {
    cpu: {
      percent: Math.min(Math.max(cpuPercent, 0), 100),
      cores: os.cpus().length,
      loadavg: os.loadavg(),
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: totalMem - freeMem,
      process: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
      }
    },
    database: {
      size: dbSize,
    },
    traffic: {
      pageViews,
      uniqueVisitors,
    },
    uptime: process.uptime(),
    timestamp: Date.now(),
  };

  return NextResponse.json(metrics, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
}
