import { NextResponse } from 'next/server';
import { publicApiError } from '@/lib/apiError';
import { requireAdmin } from '@/lib/auth';
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
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

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

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    const isHourly = diffDays <= 1;

    const totalsRaw = await prisma.$queryRaw<Array<{ total_views: bigint; total_visitors: bigint }>>`
      SELECT 
        COUNT(CASE WHEN "path" NOT LIKE '__heartbeat%' THEN 1 END)::bigint AS total_views, 
        COUNT(DISTINCT "ipHash")::bigint AS total_visitors
      FROM "PageVisit"
      WHERE "createdAt" >= ${startIso}::timestamp AND "createdAt" <= ${endIso}::timestamp
    `;
    const totalViews = Number(totalsRaw[0]?.total_views || 0);
    const totalVisitors = Number(totalsRaw[0]?.total_visitors || 0);

    type BucketRow = { bucket: Date; views: number; visitors: number };
    const bucketRows = isHourly
      ? await prisma.$queryRaw<BucketRow[]>`
          SELECT date_trunc('hour', "createdAt") AS bucket,
                 COUNT(CASE WHEN "path" NOT LIKE '__heartbeat%' THEN 1 END)::int AS views,
                 COUNT(DISTINCT "ipHash")::int AS visitors
          FROM "PageVisit"
          WHERE "createdAt" >= ${startIso}::timestamp AND "createdAt" <= ${endIso}::timestamp
          GROUP BY 1
          ORDER BY 1 ASC
        `
      : await prisma.$queryRaw<BucketRow[]>`
          SELECT date_trunc('day', "createdAt") AS bucket,
                 COUNT(CASE WHEN "path" NOT LIKE '__heartbeat%' THEN 1 END)::int AS views,
                 COUNT(DISTINCT "ipHash")::int AS visitors
          FROM "PageVisit"
          WHERE "createdAt" >= ${startIso}::timestamp AND "createdAt" <= ${endIso}::timestamp
          GROUP BY 1
          ORDER BY 1 ASC
        `;

    const pathRows = await prisma.$queryRaw<Array<{ path: string; count: number }>>`
      SELECT path, COUNT(*)::int AS count
      FROM "PageVisit"
      WHERE "createdAt" >= ${startIso}::timestamp AND "createdAt" <= ${endIso}::timestamp
        AND "path" NOT LIKE '__heartbeat%'
      GROUP BY path
      ORDER BY count DESC
      LIMIT 50
    `;

    const uaRows = await prisma.$queryRaw<Array<{ userAgent: string | null; count: number }>>`
      SELECT "userAgent", COUNT(*)::int AS count
      FROM "PageVisit"
      WHERE "createdAt" >= ${startIso}::timestamp AND "createdAt" <= ${endIso}::timestamp
        AND "path" NOT LIKE '__heartbeat%'
      GROUP BY "userAgent"
    `;

    const osCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};
    for (const row of uaRows) {
      const { os: osName, device } = parseUserAgent(row.userAgent || '');
      osCounts[osName] = (osCounts[osName] || 0) + Number(row.count || 0);
      deviceCounts[device] = (deviceCounts[device] || 0) + Number(row.count || 0);
    }

    const daily = bucketRows.map((row) => {
      const d = new Date(row.bucket);
      const timeStr = isHourly
        ? d.toLocaleDateString('en-GB') + ' ' + d.getHours() + ':00'
        : d.toLocaleDateString('en-GB');
      const views = Number(row.views || 0);
      return {
        date: timeStr,
        views,
        visitors: Number(row.visitors || 0),
        estimatedQueries: views * 12,
      };
    });

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalVisitors,
        totalPageViews: totalViews,
        totalEstimatedQueries: totalViews * 12,
      },
      daily,
      topPages: pathRows.map((r) => ({ path: r.path, count: Number(r.count || 0) })),
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

    if (format === 'md') {
      let md = `# GDVN Analytics Report\n\n`;
      md += `**Thời gian:** ${report.period.start} đến ${report.period.end}\n\n`;
      md += `## Tóm tắt\n`;
      md += `- **Lượt khách:** ${report.summary.totalVisitors.toLocaleString()}\n`;
      md += `- **Lượt xem trang:** ${report.summary.totalPageViews.toLocaleString()}\n`;
      md += `- **Lượt truy vấn (ước tính):** ${report.summary.totalEstimatedQueries.toLocaleString()}\n\n`;
      
      md += `## Biểu đồ Lượt xem theo ngày\n\n`;
      md += `| Ngày/Giờ | Lượt xem | Khách | Truy vấn |\n`;
      md += `|---|---|---|---|\n`;
      daily.forEach(d => {
        md += `| ${d.date} | ${d.views} | ${d.visitors} | ${d.estimatedQueries} |\n`;
      });
      md += `\n`;

      md += `## Top 20 Trang phổ biến\n\n`;
      md += `| Đường dẫn | Lượt xem |\n`;
      md += `|---|---|\n`;
      report.topPages.slice(0, 20).forEach(p => {
        md += `| ${p.path} | ${p.count} |\n`;
      });

      return new NextResponse(md, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="analytics_${report.period.start}_to_${report.period.end}.md"`
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
    return publicApiError(error, 'Không thể xuất dữ liệu analytics.', 500);
  }
}
