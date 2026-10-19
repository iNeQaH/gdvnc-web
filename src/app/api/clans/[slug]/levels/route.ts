import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, getSessionUser } from '@/lib/auth';
import { computeClanLevelProgress } from '@/lib/clan';
import { isSuperAdminUser } from '@/lib/roles';
import { clipText, isHttpsUrl } from '@/lib/validate';
import { pickGdCreatorName, pickGdLevelName } from '@/lib/gdDifficulty';
import { publicApiError } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

const USER_BRIEF_SELECT = {
  id: true,
  username: true,
  avatarUrl: true,
  supporterUntil: true,
  nameColor: true,
  nameGradient: true,
  nameGlow: true,
  nameFont: true,
} as const;

export function formatClanLevel(level: any) {
  const approvedRuns = (level.runs || []).filter((r: any) => r.status === 'APPROVED');
  const pendingRuns = (level.runs || []).filter((r: any) => r.status === 'PENDING');
  const progress = computeClanLevelProgress(approvedRuns);

  // Unique contributors from approved runs
  const contributorsMap = new Map<string, any>();
  for (const r of approvedRuns) {
    if (r.user && !contributorsMap.has(r.userId)) {
      contributorsMap.set(r.userId, {
        ...r.user,
        bestSegment: `${r.startPercent}–${r.endPercent}%`,
      });
    }
  }

  return {
    id: level.id,
    clanId: level.clanId,
    gdLevelId: level.gdLevelId,
    name: level.name,
    creator: level.creator,
    difficulty: level.difficulty,
    videoUrl: level.videoUrl,
    status: level.status,
    isPinned: level.isPinned,
    isCompleted: level.isCompleted || progress.isFull100,
    completedAt: level.completedAt,
    proposedBy: level.proposedBy || null,
    approvedBy: level.approvedBy || null,
    createdAt: level.createdAt,
    coveragePercent: progress.coveragePercent,
    mergedIntervals: progress.mergedIntervals,
    approvedRuns,
    pendingRuns,
    contributors: Array.from(contributorsMap.values()),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await getSessionUser();

    const clan = await prisma.clan.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        id: true,
        members: { select: { userId: true, role: true } },
      },
    });

    if (!clan) {
      return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });
    }

    const myMember = session ? clan.members.find((m) => m.userId === session.userId) : null;
    const isStaffMember =
      myMember?.role === 'LEADER' ||
      myMember?.role === 'MODERATOR' ||
      Boolean(session && isSuperAdminUser(session));

    const levels = await prisma.clanLevel.findMany({
      where: {
        clanId: clan.id,
        ...(isStaffMember ? {} : { status: 'APPROVED' }),
      },
      include: {
        proposedBy: { select: USER_BRIEF_SELECT },
        approvedBy: { select: USER_BRIEF_SELECT },
        runs: {
          where: isStaffMember
            ? { status: { in: ['APPROVED', 'PENDING'] } }
            : session
            ? { OR: [{ status: 'APPROVED' }, { userId: session.userId, status: 'PENDING' }] }
            : { status: 'APPROVED' },
          include: {
            user: { select: USER_BRIEF_SELECT },
            reviewedBy: { select: USER_BRIEF_SELECT },
          },
          orderBy: [{ startPercent: 'asc' }, { endPercent: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    const formatted = levels.map(formatClanLevel);

    return NextResponse.json({
      success: true,
      pinnedLevel: formatted.find((l) => l.isPinned && l.status === 'APPROVED') || null,
      completedLevels: formatted.filter((l) => l.isCompleted && l.status === 'APPROVED'),
      approvedLevels: formatted.filter((l) => l.status === 'APPROVED'),
      pendingLevels: isStaffMember ? formatted.filter((l) => l.status === 'PENDING') : [],
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi tải danh sách level Clan.');
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const clan = await prisma.clan.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        members: { where: { userId: auth.userId } },
      },
    });

    if (!clan) {
      return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });
    }

    const member = clan.members[0];
    const isOwner = isSuperAdminUser(auth);
    if (!member && !isOwner) {
      return NextResponse.json({ error: 'Bạn phải là thành viên của Clan để đề xuất level.' }, { status: 403 });
    }

    const isLeader = member?.role === 'LEADER' || isOwner;
    const isMod = member?.role === 'MODERATOR';
    const canApproveDirectly = isLeader || isMod;

    const body = await req.json().catch(() => ({}));
    const rawGdId = String(body?.gdLevelId || '').trim();
    if (!/^\d{1,12}$/.test(rawGdId)) {
      return NextResponse.json({ error: 'Vui lòng nhập GD Level ID hợp lệ (chỉ gồm chữ số).' }, { status: 400 });
    }

    let name = clipText(body?.name, 80)?.trim() || '';
    let creator = clipText(body?.creator, 60)?.trim() || '';
    let difficulty = clipText(body?.difficulty, 40)?.trim() || '';
    const videoUrl = clipText(body?.videoUrl, 200)?.trim() || null;

    if (videoUrl && !isHttpsUrl(videoUrl)) {
      return NextResponse.json({ error: 'Link video phải là đường dẫn HTTPS hợp lệ.' }, { status: 400 });
    }

    // 1. Try local DB Level first
    const numericId = parseInt(rawGdId, 10);
    const localLevel = await prisma.level.findUnique({
      where: { gdLevelId: numericId },
      select: { name: true, creatorName: true, difficulty: true, youtubeId: true },
    });

    if (localLevel) {
      if (!name) name = localLevel.name;
      if (!creator) creator = localLevel.creatorName || 'Unknown';
      if (!difficulty) difficulty = localLevel.difficulty || 'Extreme Demon';
    } else if (!name) {
      // 2. Try GDBrowser API if not in local DB
      try {
        const gdRes = await fetch(`https://gdbrowser.com/api/level/${rawGdId}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (gdRes.ok) {
          const gdData = await gdRes.json();
          if (String(gdData?.id) === rawGdId) {
            name = pickGdLevelName(gdData) || name;
            creator = pickGdCreatorName(gdData) || creator || 'Unknown';
            difficulty = gdData.difficulty || difficulty || 'Extreme Demon';
          }
        }
      } catch {
        /* fallback to manual fields */
      }
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Không tự động lấy được tên level từ GD Server. Vui lòng nhập thêm Tên level.' },
        { status: 400 }
      );
    }
    if (!creator) creator = 'Unknown';
    if (!difficulty) difficulty = 'Extreme Demon';

    const shouldPin = Boolean(body?.pinNow && isLeader);
    const status = canApproveDirectly ? 'APPROVED' : 'PENDING';

    const saved = await prisma.$transaction(async (tx) => {
      if (shouldPin) {
        await tx.clanLevel.updateMany({
          where: { clanId: clan.id, isPinned: true },
          data: { isPinned: false },
        });
      }

      const existing = await tx.clanLevel.findUnique({
        where: {
          clanId_gdLevelId: {
            clanId: clan.id,
            gdLevelId: rawGdId,
          },
        },
      });

      if (existing) {
        return tx.clanLevel.update({
          where: { id: existing.id },
          data: {
            name,
            creator,
            difficulty,
            ...(videoUrl ? { videoUrl } : {}),
            ...(canApproveDirectly ? { status: 'APPROVED', approvedById: auth.userId } : {}),
            ...(shouldPin ? { isPinned: true } : {}),
          },
          include: {
            proposedBy: { select: USER_BRIEF_SELECT },
            approvedBy: { select: USER_BRIEF_SELECT },
            runs: {
              include: {
                user: { select: USER_BRIEF_SELECT },
                reviewedBy: { select: USER_BRIEF_SELECT },
              },
            },
          },
        });
      }

      return tx.clanLevel.create({
        data: {
          clanId: clan.id,
          gdLevelId: rawGdId,
          name,
          creator,
          difficulty,
          videoUrl,
          status,
          isPinned: shouldPin,
          proposedById: auth.userId,
          approvedById: canApproveDirectly ? auth.userId : null,
        },
        include: {
          proposedBy: { select: USER_BRIEF_SELECT },
          approvedBy: { select: USER_BRIEF_SELECT },
          runs: {
            include: {
              user: { select: USER_BRIEF_SELECT },
              reviewedBy: { select: USER_BRIEF_SELECT },
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      level: formatClanLevel(saved),
      message: shouldPin
        ? `Đã ghim level "${saved.name}" cho Clan!`
        : canApproveDirectly
        ? `Đã thêm level "${saved.name}" vào danh sách Clan!`
        : `Đã gửi đề xuất level "${saved.name}" chờ Leader/Mod duyệt!`,
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi thêm level Clan.');
  }
}
