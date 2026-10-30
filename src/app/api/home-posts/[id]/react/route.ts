import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveUser } from '@/lib/auth';
import { publicApiError } from '@/lib/apiError';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }

  let auth;
  try {
    auth = await requireActiveUser();
  } catch (e: any) {
    if (e?.message === 'BANNED') {
      return NextResponse.json({ error: 'Tài khoản của bạn đang bị đình chỉ, không thể tương tác.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 30 reactions / 60 seconds per user
  const limited = rateLimit(`post-react:${auth.userId}`, 30, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const { id } = await params;
  try {
    const post = await prisma.homePost.findUnique({
      where: { id },
      select: { id: true, likedUserIds: true },
    });
    if (!post) {
      return NextResponse.json({ error: 'Bài viết không tồn tại.' }, { status: 404 });
    }

    const currentLikes = Array.isArray(post.likedUserIds) ? post.likedUserIds : [];
    const isLiked = currentLikes.includes(auth.userId);
    const nextLikes = isLiked
      ? currentLikes.filter((uid: string) => uid !== auth.userId)
      : [...currentLikes, auth.userId];

    await prisma.homePost.update({
      where: { id },
      data: { likedUserIds: nextLikes },
    });

    bustPublicCache(CACHE_TAGS.home, CACHE_TAGS.highlights);

    return NextResponse.json({
      success: true,
      isLiked: !isLiked,
      likesCount: nextLikes.length,
      likedUserIds: nextLikes,
    });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi thả tim bài viết.', 500);
  }
}
