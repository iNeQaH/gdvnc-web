import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const image = await prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      return new NextResponse('Not found', { status: 404 });
    }

    const dataUrl = image.dataUrl;
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      return NextResponse.redirect(dataUrl, 302);
    }
    const parts = dataUrl.split(',');
    if (parts.length !== 2) {
      return new NextResponse('Invalid image data', { status: 500 });
    }

    const match = parts[0].match(/:(.*?);/);
    const mimeType = (match ? match[1] : '').toLowerCase();
    const normalized = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    if (!ALLOWED_MIME.has(normalized)) {
      return new NextResponse('Unsupported image type', { status: 415 });
    }
    const buffer = Buffer.from(parts[1], 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': normalized,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
