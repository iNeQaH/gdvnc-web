import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import os from 'os';
import fs from 'fs';
import path from 'path';

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
  return { os: osStr, device };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const format = searchParams.get('format') || 'json';

    const endDate = endParam ? new Date(endParam) : new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = startParam ? new Date(startParam) : new Date();
    if (!startParam) {
      startDate.setDate(startDate.getDate() - 30);
    }
    startDate.setHours(0, 0, 0, 0);

    const visits = await prisma.pageVisit.findMany({
      where: { 
        createdAt: { gte: startDate, lte: endDate } 
      },
      orderBy: { createdAt: 'asc' }
    });

    const viewsByTime: Record<string, number> = {};
    const visitorsByTime: Record<string, Set<string>> = {};
    const pathCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};

    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    const isHourly = diffDays <= 1;

    let totalViews = 0;
    const allUniqueVisitors = new Set<string>();

    visits.forEach(v => {
      totalViews++;
      allUniqueVisitors.add(v.ipHash);
      
      const timeStr = isHourly 
        ? v.createdAt.toLocaleDateString('en-GB') + ' ' + v.createdAt.getHours() + ':00'
        : v.createdAt.toLocaleDateString('en-GB'); 
        
      if (!viewsByTime[timeStr]) {
        viewsByTime[timeStr] = 0;
        visitorsByTime[timeStr] = new Set();
      }
      viewsByTime[timeStr]++;
      visitorsByTime[timeStr].add(v.ipHash);
      
      pathCounts[v.path] = (pathCounts[v.path] || 0) + 1;
      const { os: osName, device } = parseUserAgent(v.userAgent || '');
      osCounts[osName] = (osCounts[osName] || 0) + 1;
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    const daily = Object.keys(viewsByTime).map(time => ({
      date: time,
      views: viewsByTime[time],
      visitors: visitorsByTime[time].size,
      estimatedQueries: viewsByTime[time] * 12
    }));

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalVisitors: allUniqueVisitors.size,
        totalPageViews: totalViews,
        totalEstimatedQueries: totalViews * 12,
      },
      daily,
      topPages: Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([path, count]) => ({ path, count })),
      os: Object.entries(osCounts).map(([name, count]) => ({ name, count })),
      devices: Object.entries(deviceCounts).map(([name, count]) => ({ name, count }))
    };

    if (format === 'csv') {
      let csv = 'Date,Views,Visitors,Estimated Queries\n';
      daily.forEach(d => {
        csv += `${d.date},${d.views},${d.visitors},${d.estimatedQueries}\n`;
      });
      csv += '\nTop Pages\nPath,Views\n';
      report.topPages.forEach(p => {
        csv += `${p.path},${p.count}\n`;
      });
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics_${report.period.start}_to_${report.period.end}.csv"`
        }
      });
    }

    return new NextResponse(JSON.stringify(report, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="analytics_${report.period.start}_to_${report.period.end}.json"`
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
