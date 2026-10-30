import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
import { publicApiError } from '@/lib/apiError';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa bài viết.' }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.homePost.delete({
      where: { id },
    });
    bustPublicCache(CACHE_TAGS.highlights, CACHE_TAGS.home);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi xóa bài viết.', 500);
  }
}
