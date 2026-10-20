import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveUser } from '@/lib/auth';
import { publicApiError } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let auth;
  try {
    auth = await requireActiveUser();
  } catch (e: any) {
    if (e?.message === 'BANNED') {
      return NextResponse.json({ error: 'Tài khoản của bạn đang bị đình chỉ, không thể tương tác.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ann = await prisma.siteAnnouncement.findUnique({
      where: { id },
      select: { id: true, likedUserIds: true },
    });
    if (!ann) {
      return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 });
    }

    const currentLikes = Array.isArray(ann.likedUserIds) ? ann.likedUserIds : [];
    const isLiked = currentLikes.includes(auth.userId);
    const nextLikes = isLiked
      ? currentLikes.filter((uid) => uid !== auth.userId)
      : [...currentLikes, auth.userId];

    await prisma.siteAnnouncement.update({
      where: { id },
      data: { likedUserIds: nextLikes },
    });

    return NextResponse.json({
      success: true,
      isLiked: !isLiked,
      likesCount: nextLikes.length,
    });
  } catch (error: any) {
    return publicApiError(error, 'Failed to react to announcement.', 500);
  }
}
