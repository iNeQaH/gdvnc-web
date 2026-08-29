import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { clipText, isHttpsUrl } from '@/lib/validate';
import { toChronicleEvent } from '@/lib/timeline/serialize';
import { sanitizeChronicleHtml } from '@/lib/timeline/sanitize';
import { isNature, isTierId } from '@/lib/timeline/types';
import { fromDateInput } from '@/lib/timeline/time';

function allowedImage(url: string) {
  if (!url) return true;
  if (url.startsWith('/api/images/')) return url.length <= 200;
  return isHttpsUrl(url);
}

function parseEventBody(body: any) {
  const title = clipText(body?.title, 160);
  const start = typeof body?.start === 'number' ? body.start : fromDateInput(body?.start);
  const endRaw = typeof body?.end === 'number' ? body.end : fromDateInput(body?.end);
  if (!title || start == null || !Number.isFinite(start)) return { error: 'Missing title or date.' };
  const end = endRaw != null && Number.isFinite(endRaw) ? Math.max(start, endRaw) : start;
  const image = clipText(body?.image, 500);
  if (!allowedImage(image)) return { error: 'Image must be an HTTPS URL.' };
  const nature = isNature(String(body?.nature || 'positive')) ? body.nature : 'positive';
  const tier = isTierId(String(body?.tier || '1y')) ? body.tier : '1y';
  return {
    data: {
      title,
      shortDescription: clipText(body?.shortDescription, 400),
      fullDescription: sanitizeChronicleHtml(clipText(body?.fullDescription, 20000)),
      image: image || null,
      startAt: new Date(start),
      endAt: new Date(end),
      approximate: Boolean(body?.approximate),
      nature,
      tier,
    },
  };
}

export async function GET(req: Request) {
  const limited = rateLimit(`timeline:${getClientIp(req)}`, 60, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const rows = await prisma.timelineEvent.findMany({
      orderBy: { startAt: 'asc' },
    });
    return NextResponse.json({ success: true, events: rows.map(toChronicleEvent) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load timeline.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = parseEventBody(body);
    if ('data' in parsed && parsed.data) {
      const row = await prisma.timelineEvent.create({ data: parsed.data });
      return NextResponse.json({ success: true, event: toChronicleEvent(row) });
    }
    return NextResponse.json({ error: parsed.error || 'Invalid event.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create event.' }, { status: 500 });
  }
}
