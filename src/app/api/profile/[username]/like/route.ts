import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveUser } from '@/lib/auth';
import { publicApiError } from '@/lib/apiError';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { isBrowserSameOriginFetch } from '@/lib/origin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
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
    return NextResponse.json({ error: 'Vui lòng đăng nhập để thả tim.' }, { status: 401 });
  }

  // Rate limit: tối đa 20 lượt thả tim / 60 giây per user để chống spam click DB
  const limited = rateLimit(`like:${auth.userId}`, 20, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);

  try {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, username: true, likedUserIds: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người chơi.' }, { status: 404 });
    }

    const currentLikes = Array.isArray(user.likedUserIds) ? user.likedUserIds : [];
    const isLiked = currentLikes.includes(auth.userId);

    // Mỗi user được thả tim 1 lần: nếu đã tim thì bấm lại sẽ bỏ tim, nếu chưa thì thêm tim
    const nextLikes = isLiked
      ? currentLikes.filter((uid) => uid !== auth.userId)
      : [...currentLikes, auth.userId];

    await prisma.user.update({
      where: { id: user.id },
      data: { likedUserIds: nextLikes },
    });

    return NextResponse.json({
      success: true,
      hasLiked: !isLiked,
      likesCount: nextLikes.length,
    });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi xử lý lượt thả tim.', 500);
  }
}
