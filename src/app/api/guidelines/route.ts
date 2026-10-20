import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import { bustPublicCache, cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';
import { publicApiError } from '@/lib/apiError';
import { getGuidelineDbKey, getDefaultGuidelineContent } from '@/lib/guidelinesDefaults';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tab = url.searchParams.get('tab') || 'main';
    const key = getGuidelineDbKey(tab);

    const content = await cachedJson(
      async () => {
        const row = await prisma.siteContent.findUnique({ where: { key } });
        if (row !== null && row !== undefined) {
          return row.html;
        }
        return getDefaultGuidelineContent(tab);
      },
      [`site-guidelines-${key}`],
      [CACHE_TAGS.faq],
      300
    );

    return NextResponse.json({ success: true, tab, content }, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    console.error('Guidelines GET error', error);
    const url = new URL(req.url);
    const tab = url.searchParams.get('tab') || 'main';
    return NextResponse.json({ success: true, tab, content: getDefaultGuidelineContent(tab) });
  }
}

export async function PUT(req: Request) {
  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const tab = body?.tab || 'main';
    const key = getGuidelineDbKey(tab);
    const markdown = clipText(body?.markdown ?? body?.content ?? body?.html ?? '', 200000);

    const row = await prisma.siteContent.upsert({
      where: { key },
      create: { key, html: markdown },
      update: { html: markdown },
    });

    bustPublicCache(CACHE_TAGS.faq);
    return NextResponse.json({ success: true, tab, content: row.html });
  } catch (error) {
    return publicApiError(error, 'Không thể lưu quy định.', 500);
  }
}
