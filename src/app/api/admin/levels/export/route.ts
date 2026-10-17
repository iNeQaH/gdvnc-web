import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { publicApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Protect against formula injection in spreadsheet applications
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase();

    const levels = await prisma.level.findMany({
      orderBy: [
        { placement: 'asc' },
        { vnPlacement: 'asc' },
        { classicRank: 'asc' },
        { gdLevelId: 'asc' }
      ]
    });

    const filtered = search
      ? levels.filter(lvl =>
          lvl.name?.toLowerCase().includes(search) ||
          lvl.creatorName?.toLowerCase().includes(search) ||
          lvl.verifierName?.toLowerCase().includes(search) ||
          String(lvl.gdLevelId).includes(search)
        )
      : levels;

    const headers = [
      'Top (Placement)',
      'VN # (VN Placement)',
      'Classic # (Classic Rank)',
      'GD Level ID',
      'Tên Level',
      'Creator (Tác giả)',
      'Verifier (Người xác thực)',
      'Chế độ (Mode)',
      'Độ khó (Difficulty)',
      'Difficulty Face (0-14)',
      'Rating Type',
      'Level VN (isVN)',
      'Challenge (isChallenge)',
      'Min %',
      'Base Pt',
      'YouTube ID',
      'Link YouTube',
      'Mô tả (Description)',
      'Ngày tạo',
      'Ngày cập nhật'
    ];

    const rows = filtered.map(lvl => [
      lvl.placement ?? '',
      lvl.vnPlacement ?? '',
      (lvl as any).classicRank ?? '',
      lvl.gdLevelId ?? '',
      lvl.name ?? '',
      lvl.creatorName ?? '',
      lvl.verifierName ?? '',
      lvl.mode ?? 'CLASSIC',
      lvl.difficulty ?? '',
      lvl.difficultyFace ?? 0,
      lvl.ratingType ?? 'NONE',
      lvl.isVN ? 'Có' : 'Không',
      lvl.isChallenge ? 'Có' : 'Không',
      lvl.minPercent ?? 100,
      lvl.basePp != null ? Number(lvl.basePp).toFixed(1) : '',
      lvl.youtubeId ?? '',
      lvl.youtubeId ? `https://youtu.be/${lvl.youtubeId}` : '',
      lvl.description ?? '',
      lvl.createdAt ? new Date(lvl.createdAt).toISOString() : '',
      lvl.updatedAt ? new Date(lvl.updatedAt).toISOString() : ''
    ]);

    // Prepend UTF-8 Byte Order Mark (BOM) so Excel automatically reads Unicode without mojibake
    const csvContent = '\uFEFF' + [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `gdvn_levels_${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error: any) {
    return publicApiError(error, 'Không thể xuất danh sách levels', 500);
  }
}
