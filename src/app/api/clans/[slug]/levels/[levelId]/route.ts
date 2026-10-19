import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { computeClanLevelProgress } from '@/lib/clan';
import { isSuperAdminUser } from '@/lib/roles';
import { clipText, isHttpsUrl } from '@/lib/validate';
import { publicApiError } from '@/lib/apiError';
import { formatClanLevel } from '../route';

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

async function fetchFormattedClanLevel(levelId: string) {
  const lvl = await prisma.clanLevel.findUnique({
    where: { id: levelId },
    include: {
      proposedBy: { select: USER_BRIEF_SELECT },
      approvedBy: { select: USER_BRIEF_SELECT },
      runs: {
        where: { status: { in: ['APPROVED', 'PENDING'] } },
        include: {
          user: { select: USER_BRIEF_SELECT },
          reviewedBy: { select: USER_BRIEF_SELECT },
        },
        orderBy: [{ startPercent: 'asc' }, { endPercent: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });
  return lvl ? formatClanLevel(lvl) : null;
}

async function recalculateLevelCompletion(levelId: string) {
  const approvedRuns = await prisma.clanLevelRun.findMany({
    where: { clanLevelId: levelId, status: 'APPROVED' },
    select: { startPercent: true, endPercent: true },
  });
  const progress = computeClanLevelProgress(approvedRuns);
  const current = await prisma.clanLevel.findUnique({
    where: { id: levelId },
    select: { isCompleted: true, completedAt: true },
  });
  if (!current) return;

  if (progress.isFull100 && !current.isCompleted) {
    await prisma.clanLevel.update({
      where: { id: levelId },
      data: {
        isCompleted: true,
        completedAt: current.completedAt || new Date(),
      },
    });
  } else if (!progress.isFull100 && current.isCompleted) {
    await prisma.clanLevel.update({
      where: { id: levelId },
      data: {
        isCompleted: false,
      },
    });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; levelId: string }> }
) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { slug, levelId } = await params;
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
      return NextResponse.json({ error: 'Chỉ thành viên trong Clan mới được nộp tiến độ.' }, { status: 403 });
    }

    const clanLevel = await prisma.clanLevel.findUnique({
      where: { id: levelId },
    });

    if (!clanLevel || clanLevel.clanId !== clan.id) {
      return NextResponse.json({ error: 'Không tìm thấy level này trong Clan.' }, { status: 404 });
    }

    if (clanLevel.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Level này chưa được duyệt trong Clan.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const startPercent = Math.round(Number(body?.startPercent ?? 0));
    const endPercent = Math.round(Number(body?.endPercent ?? 0));
    const videoUrl = clipText(body?.videoUrl, 250)?.trim() || '';
    const note = clipText(body?.note, 300)?.trim() || null;

    if (
      !Number.isFinite(startPercent) ||
      !Number.isFinite(endPercent) ||
      startPercent < 0 ||
      endPercent > 100 ||
      startPercent >= endPercent
    ) {
      return NextResponse.json(
        { error: 'Đoạn % không hợp lệ (cần 0 <= Bắt đầu < Kết thúc <= 100).' },
        { status: 400 }
      );
    }

    if (!videoUrl || !isHttpsUrl(videoUrl)) {
      return NextResponse.json(
        { error: 'Vui lòng nhập link video minh chứng hợp lệ (HTTPS).' },
        { status: 400 }
      );
    }

    await prisma.clanLevelRun.create({
      data: {
        clanLevelId: clanLevel.id,
        clanId: clan.id,
        userId: auth.userId,
        startPercent,
        endPercent,
        videoUrl,
        note,
        status: 'PENDING',
      },
    });

    const formatted = await fetchFormattedClanLevel(clanLevel.id);

    return NextResponse.json({
      success: true,
      level: formatted,
      message: `Đã nộp đoạn ${startPercent}–${endPercent}% chờ Leader/Mod duyệt!`,
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi nộp đoạn % level.');
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; levelId: string }> }
) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { slug, levelId } = await params;
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
    const isLeader = member?.role === 'LEADER' || isOwner;
    const isMod = member?.role === 'MODERATOR';

    if (!isLeader && !isMod) {
      return NextResponse.json(
        { error: 'Chỉ Leader hoặc Moderator của Clan mới có quyền thực hiện thao tác này.' },
        { status: 403 }
      );
    }

    const clanLevel = await prisma.clanLevel.findUnique({
      where: { id: levelId },
    });

    if (!clanLevel || clanLevel.clanId !== clan.id) {
      return NextResponse.json({ error: 'Không tìm thấy level này trong Clan.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'pin' || action === 'unpin') {
      if (!isLeader) {
        return NextResponse.json(
          { error: 'Chỉ Leader của Clan mới có quyền chọn hoặc gỡ level ghim.' },
          { status: 403 }
        );
      }

      if (action === 'pin') {
        await prisma.$transaction([
          prisma.clanLevel.updateMany({
            where: { clanId: clan.id, isPinned: true },
            data: { isPinned: false },
          }),
          prisma.clanLevel.update({
            where: { id: clanLevel.id },
            data: { isPinned: true, status: 'APPROVED', approvedById: auth.userId },
          }),
        ]);
      } else {
        await prisma.clanLevel.update({
          where: { id: clanLevel.id },
          data: { isPinned: false },
        });
      }

      const formatted = await fetchFormattedClanLevel(clanLevel.id);
      return NextResponse.json({
        success: true,
        level: formatted,
        message: action === 'pin' ? `Đã ghim level "${clanLevel.name}"!` : `Đã bỏ ghim level "${clanLevel.name}".`,
      });
    }

    if (action === 'approve_level') {
      await prisma.clanLevel.update({
        where: { id: clanLevel.id },
        data: {
          status: 'APPROVED',
          approvedById: auth.userId,
        },
      });
      const formatted = await fetchFormattedClanLevel(clanLevel.id);
      return NextResponse.json({
        success: true,
        level: formatted,
        message: `Đã duyệt level "${clanLevel.name}" cho Clan!`,
      });
    }

    if (action === 'reject_level') {
      await prisma.clanLevel.delete({
        where: { id: clanLevel.id },
      });
      return NextResponse.json({
        success: true,
        deletedLevelId: clanLevel.id,
        message: `Đã từ chối đề xuất level "${clanLevel.name}".`,
      });
    }

    if (action === 'approve_run' || action === 'reject_run') {
      const runId = String(body?.runId || '');
      const run = await prisma.clanLevelRun.findUnique({
        where: { id: runId },
      });
      if (!run || run.clanLevelId !== clanLevel.id) {
        return NextResponse.json({ error: 'Không tìm thấy bản nộp này.' }, { status: 404 });
      }

      if (action === 'approve_run') {
        await prisma.clanLevelRun.update({
          where: { id: run.id },
          data: {
            status: 'APPROVED',
            reviewedById: auth.userId,
            reviewedAt: new Date(),
          },
        });
      } else {
        await prisma.clanLevelRun.update({
          where: { id: run.id },
          data: {
            status: 'REJECTED',
            reviewedById: auth.userId,
            reviewedAt: new Date(),
          },
        });
      }

      await recalculateLevelCompletion(clanLevel.id);
      const formatted = await fetchFormattedClanLevel(clanLevel.id);

      return NextResponse.json({
        success: true,
        level: formatted,
        message:
          action === 'approve_run'
            ? `Đã duyệt đoạn ${run.startPercent}–${run.endPercent}%!`
            : `Đã từ chối đoạn ${run.startPercent}–${run.endPercent}%.`,
      });
    }

    return NextResponse.json({ error: 'Thao tác không hợp lệ.' }, { status: 400 });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi cập nhật level Clan.');
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; levelId: string }> }
) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { slug, levelId } = await params;
    const url = new URL(req.url);
    const runId = url.searchParams.get('runId');

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
    const isStaff = member?.role === 'LEADER' || member?.role === 'MODERATOR' || isOwner;

    if (!isStaff) {
      return NextResponse.json({ error: 'Không có quyền xoá.' }, { status: 403 });
    }

    if (runId) {
      await prisma.clanLevelRun.deleteMany({
        where: { id: runId, clanLevelId: levelId, clanId: clan.id },
      });
      await recalculateLevelCompletion(levelId);
      const formatted = await fetchFormattedClanLevel(levelId);
      return NextResponse.json({
        success: true,
        level: formatted,
        message: 'Đã xoá đoạn % khỏi level.',
      });
    }

    await prisma.clanLevel.deleteMany({
      where: { id: levelId, clanId: clan.id },
    });

    return NextResponse.json({
      success: true,
      deletedLevelId: levelId,
      message: 'Đã xoá level khỏi Clan.',
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi xoá.');
  }
}
