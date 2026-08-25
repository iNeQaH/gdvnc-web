import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { estimateDataUrlBytes } from '@/lib/profileEmbed';

const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const MAX_COVER_BYTES = 20 * 1024 * 1024;
const MAX_GENERIC_BYTES = 20 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const { dataUrl, kind } = await req.json();

    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const bytes = estimateDataUrlBytes(dataUrl);
    const maxBytes =
      kind === 'avatar' ? MAX_AVATAR_BYTES : kind === 'cover' ? MAX_COVER_BYTES : MAX_GENERIC_BYTES;

    if (bytes > maxBytes) {
      const mb = kind === 'avatar' ? 10 : 20;
      return NextResponse.json(
        { error: `Ảnh vượt quá giới hạn ${mb}MB.` },
        { status: 400 }
      );
    }

    const image = await (prisma as any).image.create({
      data: { dataUrl },
    });

    return NextResponse.json({ success: true, url: `/api/images/${image.id}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
