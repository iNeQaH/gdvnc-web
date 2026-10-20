import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveUser } from '@/lib/auth';
import { publicApiError } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  let auth;
  try {
    auth = await requireActiveUser();
  } catch (e: any) {
    if (e?.message === 'BANNED') {
      return NextResponse.json({ error: 'Tài khoản của bạn đang bị đình chỉ, không thể tương tác.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Vui lòng đăng nhập để thả tim.' }, { status: 401 });
  }

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
