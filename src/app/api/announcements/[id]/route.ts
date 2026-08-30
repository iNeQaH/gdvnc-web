import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFullAdmin } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import {
  isAnnouncementAudience,
  serializeAnnouncement,
} from '@/lib/announcements';
import type { AnnouncementAudience } from '@prisma/client';

const authorSelect = { username: true } as const;

async function resolveUsernames(raw: unknown): Promise<{ ids: string[]; error?: string }> {
  const names = Array.isArray(raw)
    ? raw.map((n) => clipText(n, 32)).filter(Boolean)
    : clipText(raw, 400)
        .split(/[,;\s]+/)
        .map((n) => n.trim())
        .filter(Boolean);
  const unique = [...new Set(names.map((n) => n.toLowerCase()))];
  if (!unique.length) return { ids: [], error: 'Need at least one username.' };
  const users = await prisma.user.findMany({
    where: { OR: unique.map((n) => ({ username: { equals: n, mode: 'insensitive' } })) },
    select: { id: true, username: true },
  });
  if (users.length !== unique.length) {
    const found = new Set(users.map((u) => u.username.toLowerCase()));
    const missing = unique.filter((n) => !found.has(n));
    return { ids: [], error: `Unknown username: ${missing.join(', ')}` };
  }
  return { ids: users.map((u) => u.id) };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const existing = await prisma.siteAnnouncement.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const body = await req.json();
    const title = body?.title != null ? clipText(body.title, 160) : existing.title;
    const excerptIn = body?.excerpt != null ? clipText(body.excerpt, 400) : existing.excerpt;
    const full = body?.body != null ? clipText(body.body, 20000) : existing.body;
    if (!title || !full) return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });

    let audience = existing.audience;
    if (body?.audience != null) {
      const audienceRaw = String(body.audience).toUpperCase();
      if (!isAnnouncementAudience(audienceRaw)) {
        return NextResponse.json({ error: 'Invalid audience.' }, { status: 400 });
      }
      audience = audienceRaw as AnnouncementAudience;
    }

    let targetUserIds = existing.targetUserIds;
    if (audience === 'USERS' && (body?.usernames != null || body?.targetUsernames != null)) {
      const resolved = await resolveUsernames(body?.usernames ?? body?.targetUsernames);
      if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: 400 });
      targetUserIds = resolved.ids;
    }
    if (audience !== 'USERS') targetUserIds = [];

    const row = await prisma.siteAnnouncement.update({
      where: { id },
      data: {
        title,
        excerpt: excerptIn || full.slice(0, 180),
        body: full,
        audience,
        targetUserIds,
      },
      include: { author: { select: authorSelect } },
    });

    return NextResponse.json({
      success: true,
      announcement: serializeAnnouncement(row, { includeTargets: true }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update announcement.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await prisma.siteAnnouncement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete announcement.' }, { status: 500 });
  }
}
