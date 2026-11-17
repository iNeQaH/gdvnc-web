import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền sửa bài viết.' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const existing = await prisma.homePost.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy bài viết.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const dataToUpdate: any = {};

    if (body.title !== undefined) {
      const title = clipText(body.title, 200)?.trim();
      if (!title) {
        return NextResponse.json({ error: 'Tiêu đề không được để trống.' }, { status: 400 });
      }
      dataToUpdate.title = title;
    }

    if (body.body !== undefined) {
      const rawBody = typeof body.body === 'string' ? body.body.trim() : '';
      if (!rawBody) {
        return NextResponse.json({ error: 'Nội dung không được để trống.' }, { status: 400 });
      }
      dataToUpdate.body = sanitizeFaqHtml(rawBody);
    }

    if (body.linkUrl !== undefined) {
      if (typeof body.linkUrl === 'string' && body.linkUrl.trim()) {
        const u = body.linkUrl.trim();
        if (u.startsWith('https://') || u.startsWith('http://') || u.startsWith('/')) {
          dataToUpdate.linkUrl = u.slice(0, 500);
        } else {
          dataToUpdate.linkUrl = null;
        }
      } else {
        dataToUpdate.linkUrl = null;
      }
    }

    if (body.levelGdId !== undefined) {
      if (body.levelGdId !== null && String(body.levelGdId).trim()) {
        dataToUpdate.levelGdId = String(body.levelGdId).trim().slice(0, 30);
      } else {
        dataToUpdate.levelGdId = null;
      }
    }

    if (body.videoUrl !== undefined) {
      if (typeof body.videoUrl === 'string' && body.videoUrl.trim()) {
        dataToUpdate.videoUrl = body.videoUrl.trim().slice(0, 500);
      } else {
        dataToUpdate.videoUrl = null;
      }
    }

    if (body.isPinned !== undefined) {
      dataToUpdate.isPinned = Boolean(body.isPinned);
    }

    if (body.poll !== undefined) {
      if (body.poll && typeof body.poll === 'object' && Array.isArray(body.poll.options) && body.poll.options.length >= 2) {
        const existingPoll = (existing.poll as any) || {};
        dataToUpdate.poll = {
          question: clipText(body.poll.question, 200)?.trim() || 'Bình chọn',
          options: body.poll.options.slice(0, 10).map((opt: any, idx: number) => {
            const optId = String(idx + 1);
            const oldOpt = existingPoll.options?.find?.((o: any) => o.id === optId);
            return {
              id: optId,
              text: clipText(typeof opt === 'string' ? opt : opt.text, 100)?.trim() || `Lựa chọn ${idx + 1}`,
              votes: oldOpt?.votes || 0,
            };
          }),
          voterUserIds: existingPoll.voterUserIds || {},
        };
      } else if (body.poll === null) {
        dataToUpdate.poll = null;
      }
    }

    const updatedPost = await prisma.homePost.update({
      where: { id },
      data: dataToUpdate,
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
    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi cập nhật bài viết.', 500);
  }
}
