import { NextRequest } from 'next/server';
import { renderSiteOgImage } from '@/lib/siteOg';
import { getTimelineShareMeta } from '@/lib/timeline/embed';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const meta = await getTimelineShareMeta(id);
    if (!meta) return new Response('Not found', { status: 404 });
    return renderSiteOgImage(meta.title.replace(' | THE CHRONICLES', ''), meta.description);
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
