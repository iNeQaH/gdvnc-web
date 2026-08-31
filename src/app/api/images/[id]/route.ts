import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const image = await (prisma as any).image.findUnique({
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
    const mimeType = match ? match[1] : 'image/jpeg';
    const buffer = Buffer.from(parts[1], 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
