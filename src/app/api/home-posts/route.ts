import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin, getSessionUser } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/requestIp';
import { publicApiError } from '@/lib/apiError';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export async function GET() {
  try {
    const posts = await prisma.homePost.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 20,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi lấy danh sách bài viết.', 500);
  }
}

export async function POST(req: Request) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let auth;
  try {
    auth = await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền tạo bài viết trang chủ.' }, { status: 403 });
  }

  const limited = rateLimit(`home-posts:create:${auth.userId}:${getClientIp(req)}`, 10, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = await req.json().catch(() => ({}));
    const title = clipText(body.title, 200)?.trim();
    const rawBody = typeof body.body === 'string' ? body.body.trim() : '';

    if (!title || !rawBody) {
      return NextResponse.json({ error: 'Tiêu đề và nội dung không được để trống.' }, { status: 400 });
    }

    const sanitizedBody = sanitizeFaqHtml(rawBody);

    let linkUrl: string | null = null;
    if (typeof body.linkUrl === 'string' && body.linkUrl.trim()) {
      const u = body.linkUrl.trim();
      if (u.startsWith('https://') || u.startsWith('http://') || u.startsWith('/')) {
        linkUrl = u.slice(0, 500);
      }
    }

    let levelGdId: string | null = null;
    if (body.levelGdId !== undefined && body.levelGdId !== null && String(body.levelGdId).trim()) {
      levelGdId = String(body.levelGdId).trim().slice(0, 30);
    }

    let videoUrl: string | null = null;
    if (typeof body.videoUrl === 'string' && body.videoUrl.trim()) {
      videoUrl = body.videoUrl.trim().slice(0, 500);
    }

    let poll: any = null;
    if (body.poll && typeof body.poll === 'object' && Array.isArray(body.poll.options) && body.poll.options.length >= 2) {
      poll = {
        question: clipText(body.poll.question, 200)?.trim() || 'Bình chọn',
        options: body.poll.options.slice(0, 10).map((opt: any, idx: number) => ({
          id: String(idx + 1),
          text: clipText(typeof opt === 'string' ? opt : opt.text, 100)?.trim() || `Lựa chọn ${idx + 1}`,
          votes: 0,
        })),
        voterUserIds: {},
      };
    }

    const isPinned = Boolean(body.isPinned);

    const post = await prisma.homePost.create({
      data: {
        title,
        body: sanitizedBody,
        linkUrl,
        levelGdId,
        videoUrl,
        poll: poll || undefined,
        isPinned,
        authorId: auth.userId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    bustPublicCache(CACHE_TAGS.highlights, CACHE_TAGS.home);

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi tạo bài viết trang chủ.', 500);
  }
}
