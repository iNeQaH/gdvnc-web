import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  try {
    const body = await req.json();
    const title = clipText(body?.title, 160);
    const start = typeof body?.start === 'number' ? body.start : fromDateInput(body?.start);
    const endRaw = typeof body?.end === 'number' ? body.end : fromDateInput(body?.end);
    if (!title || start == null || !Number.isFinite(start)) {
      return NextResponse.json({ error: 'Missing title or date.' }, { status: 400 });
    }
    const end = endRaw != null && Number.isFinite(endRaw) ? Math.max(start, endRaw) : start;
    const image = clipText(body?.image, 500);
    if (!allowedImage(image)) {
      return NextResponse.json({ error: 'Image must be an HTTPS URL.' }, { status: 400 });
    }

    const row = await prisma.timelineEvent.update({
      where: { id },
      data: {
        title,
        shortDescription: clipText(body?.shortDescription, 400),
        fullDescription: sanitizeChronicleHtml(clipText(body?.fullDescription, 20000)),
        image: image || null,
        startAt: new Date(start),
        endAt: new Date(end),
        approximate: Boolean(body?.approximate),
        nature: isNature(String(body?.nature || 'positive')) ? body.nature : 'positive',
        tier: isTierId(String(body?.tier || '1y')) ? body.tier : '1y',
      },
    });
    return NextResponse.json({ success: true, event: toChronicleEvent(row) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update event.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  try {
    await prisma.timelineEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete event.' }, { status: 500 });
  }
}
