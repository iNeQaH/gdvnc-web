import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';
import { bustPublicCache, cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';

const SUBMIT_NOTE_PLAYER_KEY = 'submit-note';
const SUBMIT_NOTE_CREATOR_KEY = 'submit-note-creator';

const DEFAULT_PLAYER_NOTE_HTML = `<div class="font-bold ui-title mb-1">Lưu ý khi nộp kỷ lục (Player):</div><ul class="list-disc list-inside space-y-0.5"><li>Video hoàn thành phải có tiếng clicks (micro) rõ ràng hoặc raw footage chưa cắt.</li><li>Điền chính xác tần số quét màn hình (Hz) và FPS (Physics Bypass).</li><li>Nếu dùng CBF thì để FPS là 0.</li></ul>`;

const DEFAULT_CREATOR_NOTE_HTML = `<div class="font-bold ui-title mb-1">Lưu ý khi nộp tác phẩm (Creator):</div><ul class="list-disc list-inside space-y-0.5"><li>Tác phẩm nộp phải do chính bạn hoặc nhóm tác giả tạo ra.</li><li>Điền chính xác ID màn chơi (GD Level ID) nếu level đã công bố trên GD.</li><li>Điền các thông tin lưu ý cần thiết cho BQT để tiện theo dõi và kiểm duyệt.</li></ul>`;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') === 'CREATOR' ? 'CREATOR' : 'PLAYER';
    const key = type === 'CREATOR' ? SUBMIT_NOTE_CREATOR_KEY : SUBMIT_NOTE_PLAYER_KEY;
    const defaultHtml = type === 'CREATOR' ? DEFAULT_CREATOR_NOTE_HTML : DEFAULT_PLAYER_NOTE_HTML;

    const html = await cachedJson(
      async () => {
        const row = await prisma.siteContent.findUnique({ where: { key } });
        return row?.html || defaultHtml;
      },
      [`submit-note-html-${type}`],
      [CACHE_TAGS.faq],
      300
    );
    return NextResponse.json({ success: true, html, type }, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    console.error('Submit note GET error', error);
    return NextResponse.json({ success: true, html: DEFAULT_PLAYER_NOTE_HTML, type: 'PLAYER' });
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
    const type = body?.type === 'CREATOR' ? 'CREATOR' : 'PLAYER';
    const key = type === 'CREATOR' ? SUBMIT_NOTE_CREATOR_KEY : SUBMIT_NOTE_PLAYER_KEY;
    const html = sanitizeFaqHtml(clipText(body?.html, 200000));
    const row = await prisma.siteContent.upsert({
      where: { key },
      create: { key, html },
      update: { html },
    });
    bustPublicCache(CACHE_TAGS.faq);
    return NextResponse.json({ success: true, html: row.html, type });
  } catch (error) {
    console.error('Submit note PUT error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
