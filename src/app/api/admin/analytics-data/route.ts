import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import os from 'os';

export const dynamic = 'force-dynamic';

function parseUserAgent(ua: string) {
  if (!ua) return { os: 'Unknown', device: 'Desktop', browser: 'Unknown' };
  
  let osStr = 'Unknown';
  if (ua.includes('Windows')) osStr = 'Windows';
  else if (ua.includes('Mac OS')) osStr = 'Mac OS';
  else if (ua.includes('Linux')) osStr = 'Linux';
  else if (ua.includes('Android')) osStr = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) osStr = 'iOS';
  
  let device = 'Desktop';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'Tablet';
  
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  return { os: osStr, device, browser };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    // Collect DB stats
    const dbMetricsRaw: any[] = await prisma.$queryRaw`
      SELECT 
        pg_database_size(current_database()) as db_size,
        numbackends as active_connections,
        xact_commit, xact_rollback,
        blks_read, blks_hit,
        deadlocks
      FROM pg_stat_database 
      WHERE datname = current_database();
    `;
    
    const tableMetricsRaw: any[] = await prisma.$queryRaw`
      SELECT 
        sum(n_tup_ins) as inserted,
        sum(n_tup_upd) as updated,
        sum(n_tup_del) as deleted
      FROM pg_stat_user_tables;
    `;
    
    let cacheHitRate = 100;
    const dbM = dbMetricsRaw[0] || {};
    const blksRead = Number(dbM.blks_read) || 0;
    const blksHit = Number(dbM.blks_hit) || 0;
    if (blksRead + blksHit > 0) {
      cacheHitRate = (blksHit / (blksRead + blksHit)) * 100;
    }
    const tM = tableMetricsRaw[0] || {};

    // Get Traffic Data
    const endDate = endParam ? new Date(endParam) : new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = startParam ? new Date(startParam) : new Date();
    if (!startParam) {
      startDate.setDate(startDate.getDate() - 7);
    }
    startDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    const isHourly = diffDays <= 3;
    
    const visits = await prisma.pageVisit.findMany({
      where: { 
        createdAt: { 
          gte: startDate,
          lte: endDate
        } 
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Get Online Users (last 5 minutes)
    const fiveMinsAgo = new Date();
    fiveMinsAgo.setMinutes(fiveMinsAgo.getMinutes() - 5);
    const onlineVisits = await prisma.pageVisit.findMany({
      where: { createdAt: { gte: fiveMinsAgo } },
      select: { ipHash: true }
    });
    const onlineUsers = new Set(onlineVisits.map(v => v.ipHash)).size;

    // Aggregate Traffic Data
    const viewsByTime: Record<string, number> = {};
    const visitorsByTime: Record<string, Set<string>> = {};
    const pathCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};

    // Pre-fill time slots based on selected range
    const current = new Date(startDate);
    if (isHourly) {
      while (current <= endDate) {
        const ts = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
                   current.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        viewsByTime[ts] = 0;
        visitorsByTime[ts] = new Set();
        current.setHours(current.getHours() + 1);
      }
    } else {
      while (current <= endDate) {
        const ds = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        viewsByTime[ds] = 0;
        visitorsByTime[ds] = new Set();
        current.setDate(current.getDate() + 1);
      }
    }

    let totalViews = 0;
    const allUniqueVisitors = new Set<string>();

    visits.forEach(v => {
      totalViews++;
      allUniqueVisitors.add(v.ipHash);
      
      const timeStr = isHourly 
        ? v.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + v.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
        : v.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
      if (viewsByTime[timeStr] !== undefined) {
        viewsByTime[timeStr]++;
        visitorsByTime[timeStr].add(v.ipHash);
      }
      
      pathCounts[v.path] = (pathCounts[v.path] || 0) + 1;
      const { os: osName, device } = parseUserAgent(v.userAgent || '');
      osCounts[osName] = (osCounts[osName] || 0) + 1;
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    const trafficChart = Object.keys(viewsByTime).map(time => ({
      time,
      views: viewsByTime[time],
      visitors: visitorsByTime[time].size
    }));

    const topPages = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([path, count]) => ({ path, count }));
    const osStats = Object.entries(osCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
    const deviceStats = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      success: true,
      onlineUsers,
      compute: {
        cpu: { cores: os.cpus().length, loadavg: os.loadavg()[0] },
        memory: { total: os.totalmem(), free: os.freemem(), rss: process.memoryUsage().rss }
      },
      database: {
        size: Number(dbM.db_size) || 0,
        connections: Number(dbM.active_connections) || 0,
        cacheHitRate,
        deadlocks: Number(dbM.deadlocks) || 0,
        rows: {
          inserted: Number(tM.inserted) || 0,
          updated: Number(tM.updated) || 0,
          deleted: Number(tM.deleted) || 0,
        }
      },
      traffic: {
        totalViews,
        totalVisitors: allUniqueVisitors.size,
        chart: trafficChart,
        topPages,
        osStats,
        deviceStats
      }
    });

  } catch (error: any) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
