import { isBrowserSameOriginFetch } from '@/lib/origin';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';
import { publicApiError } from '@/lib/apiError';

const FAQ_KEY = 'helps-faq';

export async function GET() {
  try {
    const row = await prisma.siteContent.findUnique({ where: { key: FAQ_KEY } });
    const content = row?.html || '';
    return NextResponse.json(
      { success: true, content, html: content },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('FAQ GET error', error);
    return NextResponse.json(
      { success: true, content: '', html: '' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  }
}

export async function PUT(req: Request) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const markdown = clipText(body?.content ?? body?.markdown ?? body?.html ?? '', 200000);
    const row = await prisma.siteContent.upsert({
      where: { key: FAQ_KEY },
      create: { key: FAQ_KEY, html: markdown },
      update: { html: markdown },
    });
    bustPublicCache(CACHE_TAGS.faq);
    return NextResponse.json({ success: true, content: row.html, html: row.html });
  } catch (error) {
    return publicApiError(error, 'Không thể lưu FAQ.', 500);
  }
}
