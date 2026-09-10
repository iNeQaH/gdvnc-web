import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';
import { bustPublicCache, cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';

const GUIDELINES_KEY = 'site-guidelines';

const DEFAULT_GUIDELINES_HTML = `<div className="space-y-4">
  <h2 className="text-base font-bold text-sky-400">1. Quy Định Chung</h2>
  <ul className="list-disc list-inside space-y-1 text-xs">
    <li>Tôn trọng các thành viên trong cộng đồng Geometry Dash Việt Nam (GDVN).</li>
    <li>Không sử dụng phần mềm gian lận, hack, hoặc bot để nộp kỷ lục giả.</li>
    <li>Tất cả kỷ lục submitted phải tuân thủ đúng yêu cầu chứng minh (clicks/raw footage).</li>
  </ul>
  <h2 className="text-base font-bold text-sky-400">2. Quy Định Nộp Kỷ Lục</h2>
  <ul className="list-disc list-inside space-y-1 text-xs">
    <li>Video phải có âm thanh clicks/taps rõ ràng hoặc raw footage không qua chỉnh sửa.</li>
    <li>Điền đúng thông tin Tần số quét (Hz) và FPS (Physics Bypass). Dùng CBF để FPS là 0.</li>
  </ul>
</div>`;

export async function GET() {
  try {
    const html = await cachedJson(
      async () => {
        const row = await prisma.siteContent.findUnique({ where: { key: GUIDELINES_KEY } });
        return row?.html || DEFAULT_GUIDELINES_HTML;
      },
      ['site-guidelines-html'],
      [CACHE_TAGS.faq],
      300
    );
    return NextResponse.json({ success: true, html }, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    console.error('Guidelines GET error', error);
    return NextResponse.json({ success: true, html: DEFAULT_GUIDELINES_HTML });
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
      where: { key: GUIDELINES_KEY },
      create: { key: GUIDELINES_KEY, html },
      update: { html },
    });
    bustPublicCache(CACHE_TAGS.faq);
    return NextResponse.json({ success: true, html: row.html });
  } catch (error) {
    console.error('Guidelines PUT error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
