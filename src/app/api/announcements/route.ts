import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, requireFullAdmin } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import {
  canSeeAnnouncement,
  isAnnouncementAudience,
  serializeAnnouncement,
  type Viewer,
} from '@/lib/announcements';
import type { AnnouncementAudience } from '@prisma/client';

const authorSelect = { username: true } as const;

async function loadViewer(): Promise<Viewer | null> {
  const auth = await getAuthUser();
  if (!auth) return null;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, role: true, supporterUntil: true },
  });
  return user;
}

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

function parseBody(body: any) {
  const title = clipText(body?.title, 160);
  const excerpt = clipText(body?.excerpt, 400);
  const full = clipText(body?.body, 20000);
  if (!title || !full) return { error: 'Title and content are required.' };
  const audienceRaw = String(body?.audience || 'ALL').toUpperCase();
  if (!isAnnouncementAudience(audienceRaw)) return { error: 'Invalid audience.' };
  return {
    data: {
      title,
      excerpt: excerpt || full.slice(0, 180),
      body: full,
      audience: audienceRaw as AnnouncementAudience,
    },
  };
}

export async function GET(req: Request) {
  const limited = rateLimit(`announcements:${getClientIp(req)}`, 60, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const { searchParams } = new URL(req.url);
  const manage = searchParams.get('manage') === '1';

  try {
    const viewer = await loadViewer();
    if (manage) {
      try {
        await requireFullAdmin();
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const rows = await prisma.siteAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { author: { select: authorSelect } },
    });

    const visible = manage
      ? rows
      : rows.filter((row) => canSeeAnnouncement(viewer, row));

    const readIds = new Set<string>();
    if (viewer) {
      const reads = await prisma.announcementRead.findMany({
        where: { userId: viewer.id, announcementId: { in: visible.map((r) => r.id) } },
        select: { announcementId: true },
      });
      for (const r of reads) readIds.add(r.announcementId);
    }

    return NextResponse.json({
      success: true,
      announcements: visible.map((row) =>
        serializeAnnouncement(row, {
          includeTargets: manage,
          isRead: viewer ? readIds.has(row.id) : true,
        })
      ),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load announcements.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = parseBody(body);
    if (!('data' in parsed) || !parsed.data) {
      return NextResponse.json({ error: parsed.error || 'Invalid announcement.' }, { status: 400 });
    }

    let targetUserIds: string[] = [];
    if (parsed.data.audience === 'USERS') {
      const resolved = await resolveUsernames(body?.usernames ?? body?.targetUsernames);
      if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: 400 });
      targetUserIds = resolved.ids;
    }

    const row = await prisma.siteAnnouncement.create({
      data: {
        ...parsed.data,
        targetUserIds,
        authorId: auth.userId,
      },
      include: { author: { select: authorSelect } },
    });

    return NextResponse.json({
      success: true,
      announcement: serializeAnnouncement(row, { includeTargets: true }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create announcement.' }, { status: 500 });
  }
}
