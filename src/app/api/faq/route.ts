import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';
import { bustPublicCache, cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';

const FAQ_KEY = 'helps-faq';

export async function GET() {
  try {
    const html = await cachedJson(
      async () => {
        const row = await prisma.siteContent.findUnique({ where: { key: FAQ_KEY } });
        return row?.html || '';
      },
      ['faq-html'],
      [CACHE_TAGS.faq],
      300
    );
    return NextResponse.json({ success: true, html }, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    console.error('FAQ GET', error);
    return NextResponse.json({ success: true, html: '' });
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
    const html = sanitizeFaqHtml(clipText(body?.html, 200000));
    const row = await prisma.siteContent.upsert({
      where: { key: FAQ_KEY },
      create: { key: FAQ_KEY, html },
      update: { html },
    });
    bustPublicCache(CACHE_TAGS.faq);
    return NextResponse.json({ success: true, html: row.html });
  } catch (error) {
    console.error('FAQ PUT', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
