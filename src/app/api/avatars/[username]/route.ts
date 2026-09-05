import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function bufferFromDataUrl(dataUrl: string) {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) return null;
  const match = parts[0].match(/:(.*?);/);
  return {
    mimeType: match ? match[1] : 'image/jpeg',
    buffer: Buffer.from(parts[1], 'base64'),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    const user = await prisma.user.findUnique({
      where: { username: decodeURIComponent(username) },
      select: { avatarUrl: true },
    });

    if (!user?.avatarUrl) {
      return new NextResponse('Not found', { status: 404 });
    }

    let dataUrl = user.avatarUrl;

    const imageMatch = dataUrl.match(/^\/api\/images\/([^/?#]+)/);
    if (imageMatch) {
      const image = await (prisma as any).image.findUnique({ where: { id: imageMatch[1] } });
      if (!image?.dataUrl) return new NextResponse('Not found', { status: 404 });
      dataUrl = image.dataUrl;
    }

    if (dataUrl.startsWith('data:')) {
      const parsed = bufferFromDataUrl(dataUrl);
      if (!parsed) return new NextResponse('Invalid image data', { status: 500 });
      return new NextResponse(parsed.buffer, {
        headers: {
          'Content-Type': parsed.mimeType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      return NextResponse.redirect(dataUrl, 302);
    }

    return new NextResponse('Not found', { status: 404 });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
