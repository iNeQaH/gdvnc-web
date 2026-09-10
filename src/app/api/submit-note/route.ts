import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';
import { bustPublicCache, cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';

const SUBMIT_NOTE_KEY = 'submit-note';

const DEFAULT_SUBMIT_NOTE_HTML = `<div className="font-bold ui-title mb-1">Lưu ý khi nộp:</div><ul className="list-disc list-inside space-y-0.5"><li>Video hoàn thành phải có tiếng clicks (micro) rõ ràng hoặc raw footage chưa cắt.</li><li>Điền chính xác tần số quét màn hình (Hz) và FPS (Physics Bypass).</li><li>Nếu dùng CBF thì để FPS là 0</li></ul>`;

export async function GET() {
  try {
    const html = await cachedJson(
      async () => {
        const row = await prisma.siteContent.findUnique({ where: { key: SUBMIT_NOTE_KEY } });
        return row?.html || DEFAULT_SUBMIT_NOTE_HTML;
      },
      ['submit-note-html'],
      [CACHE_TAGS.faq],
      300
    );
    return NextResponse.json({ success: true, html }, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    console.error('Submit note GET error', error);
    return NextResponse.json({ success: true, html: DEFAULT_SUBMIT_NOTE_HTML });
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
      where: { key: SUBMIT_NOTE_KEY },
      create: { key: SUBMIT_NOTE_KEY, html },
      update: { html },
    });
    bustPublicCache(CACHE_TAGS.faq);
    return NextResponse.json({ success: true, html: row.html });
  } catch (error) {
    console.error('Submit note PUT error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
