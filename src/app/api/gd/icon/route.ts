import { NextRequest, NextResponse } from 'next/server';
import { renderGdPlayerIcon } from '@/lib/gdIconRenderer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const form = searchParams.get('form') || 'cube';
    const rawIcon = parseInt(searchParams.get('icon') || '1', 10);
    const icon = Number.isFinite(rawIcon) && rawIcon > 0 ? rawIcon : 1;
    const rawCol1 = parseInt(searchParams.get('col1') || '0', 10);
    const col1 = Number.isFinite(rawCol1) && rawCol1 >= 0 ? rawCol1 : 0;
    const rawCol2 = parseInt(searchParams.get('col2') || '0', 10);
    const col2 = Number.isFinite(rawCol2) && rawCol2 >= 0 ? rawCol2 : 0;
    const glowParam = searchParams.get('glow');
    const glow = glowParam === '1' || glowParam === 'true';
    const colGParam = searchParams.get('colG');
    const rawColG = colGParam !== null ? parseInt(colGParam, 10) : undefined;
    const colG = rawColG !== undefined && Number.isFinite(rawColG) && rawColG >= 0 ? rawColG : undefined;
    const rawSize = parseInt(searchParams.get('size') || '128', 10);
    const size = Number.isFinite(rawSize) ? Math.min(256, Math.max(32, rawSize)) : 128;

    const pngBuffer = await renderGdPlayerIcon({
      form,
      icon,
      col1,
      col2,
      glow,
      colG,
      size,
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  } catch (error: any) {
    console.error('Error rendering GD icon:', error);
    try {
      // Safe fallback to default cube 01
      const fallbackPng = await renderGdPlayerIcon({
        form: 'cube',
        icon: 1,
        col1: 0,
        col2: 3,
        size: 128,
      });
      return new NextResponse(new Uint8Array(fallbackPng), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
      });
    } catch {
      return new NextResponse('Failed to render icon', {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
