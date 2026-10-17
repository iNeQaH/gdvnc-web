import { requireAuth, getSessionUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateUserSp, getClanTier, syncAndGetClanSp } from '@/lib/clan';
import { isFullAdminRole, isSuperAdminUser } from '@/lib/roles';
import { clipText, isHttpsUrl } from '@/lib/validate';
import { publicApiError } from '@/lib/apiError';
import { RecordStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const sessionUser = await getSessionUser();

    const rawClan = await prisma.clan.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        leader: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            supporterUntil: true,
            nameColor: true,
            nameGradient: true,
            nameFont: true,
            classicPp: true,
            platformerPp: true,
          },
        },
        favoriteLevel: {
          select: {
            id: true,
            gdLevelId: true,
            name: true,
            difficulty: true,
            difficultyFace: true,
            ratingType: true,
            creatorName: true,
            youtubeId: true,
            basePp: true,
            mode: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                supporterUntil: true,
                nameColor: true,
                nameGradient: true,
                nameGlow: true,
                nameFont: true,
                classicPp: true,
                platformerPp: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        contributions: {
          include: {
            user: { select: { id: true, supporterUntil: true } },
          },
        },
      },
    });

    if (!rawClan) {
      return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });
    }

    // Đồng bộ điểm SP và kiểm tra trạng thái ân hạn / tạm ngưng
    const clan = await syncAndGetClanSp(rawClan.id);
    if (!clan) {
      return NextResponse.json({ error: 'Lỗi tải Clan.' }, { status: 500 });
    }

    const memberUserIds = rawClan.members.map((m) => m.userId);

    // 1. Top 5 level khó nhất được beat bởi thành viên trong clan
    const approvedRecords = await prisma.record.findMany({
      where: {
        userId: { in: memberUserIds },
        status: RecordStatus.APPROVED,
        progress: 100,
      },
      include: {
        level: {
          select: {
            id: true,
            gdLevelId: true,
            name: true,
            difficultyFace: true,
            ratingType: true,
            placement: true,
            classicRank: true,
            vnPlacement: true,
            basePp: true,
            mode: true,
            youtubeId: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            nameColor: true,
            nameGradient: true,
          },
        },
      },
      orderBy: { level: { basePp: 'desc' } },
      take: 20,
    });

    // Lọc trùng level, giữ lại record có basePp cao nhất
    const uniqueBeatenLevelsMap = new Map<string, typeof approvedRecords[0]>();
    for (const rec of approvedRecords) {
      if (!uniqueBeatenLevelsMap.has(rec.levelId)) {
        uniqueBeatenLevelsMap.set(rec.levelId, rec);
      }
    }
    const top5Beaten = Array.from(uniqueBeatenLevelsMap.values()).slice(0, 5);

    // 2. Slideshow các level / tác phẩm của Creator trong clan đã được duyệt
    const creatorWorks = await prisma.creatorWork.findMany({
      where: {
        userId: { in: memberUserIds },
        status: RecordStatus.APPROVED,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    });

    // Lookup matching Level rows by gdLevelId to enrich with level thumbnail, youtubeId, difficultyFace, etc.
    const gdIds = creatorWorks
      .map((w) => w.gdLevelId)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    const levelsByGdId = new Map<number, any>();
    if (gdIds.length > 0) {
      const dbLevels = await prisma.level.findMany({
        where: { gdLevelId: { in: gdIds } },
        select: {
          id: true,
          gdLevelId: true,
          name: true,
          difficulty: true,
          difficultyFace: true,
          ratingType: true,
          youtubeId: true,
          creatorName: true,
          mode: true,
          basePp: true,
        },
      });
      for (const lvl of dbLevels) {
        if (lvl.gdLevelId) levelsByGdId.set(lvl.gdLevelId, lvl);
      }
    }

    const enrichedCreatorWorks = creatorWorks.map((work) => {
      const lvl = work.gdLevelId ? levelsByGdId.get(work.gdLevelId) : null;
      return {
        ...work,
        youtubeId: lvl?.youtubeId || null,
        levelId: lvl?.id || null,
        difficultyFace: work.difficultyFace || lvl?.difficultyFace || 0,
        ratingType: work.ratingType && work.ratingType !== 'NONE' ? work.ratingType : (lvl?.ratingType || 'NONE'),
        matchedLevel: lvl || null,
      };
    });

    // 3. Phân chia danh sách thành viên theo quyền hạn
    const leaderMember = rawClan.members.find((m) => m.role === 'LEADER');
    const modMembers = rawClan.members.filter((m) => m.role === 'MODERATOR');
    const regularMembers = rawClan.members.filter((m) => m.role === 'MEMBER');

    // 4. Kiểm tra trạng thái của người đang xem
    let myMembership = null;
    let myPendingRequest = null;
    let pendingRequests: any[] = [];
    if (sessionUser) {
      myMembership = rawClan.members.find((m) => m.userId === sessionUser.userId) || null;
      if (!myMembership) {
        myPendingRequest = await prisma.clanJoinRequest.findUnique({
          where: {
            clanId_userId: {
              clanId: rawClan.id,
              userId: sessionUser.userId,
            },
          },
        });
      } else if (myMembership.role === 'LEADER' || myMembership.role === 'MODERATOR' || isSuperAdminUser(sessionUser)) {
        pendingRequests = await prisma.clanJoinRequest.findMany({
          where: { clanId: rawClan.id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                supporterUntil: true,
                nameColor: true,
                nameGradient: true,
                classicPp: true,
                platformerPp: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    const tierInfo = getClanTier(clan.totalSp);

    return NextResponse.json({
      success: true,
      clan: {
        id: rawClan.id,
        name: rawClan.name,
        tag: rawClan.tag,
        slug: rawClan.slug,
        description: rawClan.description,
        avatarUrl: rawClan.avatarUrl,
        coverUrl: rawClan.coverUrl,
        videoUrl: rawClan.videoUrl,
        favoriteLevel: rawClan.favoriteLevel,
        color: rawClan.color,
        colorGradient: tierInfo.tier >= 2 ? rawClan.colorGradient : null,
        themeColor: rawClan.themeColor,
        themeGradient: tierInfo.tier >= 2 ? rawClan.themeGradient : null,
        totalSp: clan.totalSp,
        tier: tierInfo.tier,
        tierName: tierInfo.name,
        maxMembers: tierInfo.maxMembers,
        memberCount: rawClan.members.length,
        isSuspended: clan.isSuspended,
        gracePeriodUntil: clan.gracePeriodUntil,
        leader: rawClan.leader,
        top5Beaten,
        creatorWorks: enrichedCreatorWorks,
        membersGrouped: {
          leader: leaderMember,
          mods: modMembers,
          members: regularMembers,
        },
        myMembership,
        myPendingRequest,
        pendingRequests,
        createdAt: rawClan.createdAt,
      },
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi tải thông tin Clan.');
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
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
        contributions: {
          include: { user: { select: { supporterUntil: true } } },
        },
      },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const member = clan.members[0];
    const isClanLeader = member?.role === 'LEADER';
    const isClanMod = member?.role === 'MODERATOR';
    const isOwner = isSuperAdminUser(auth);

    // QUY TẮC BẢO MẬT: Chỉ Leader Clan, Mod Clan, hoặc Owner Web mới được sửa thông tin Clan.
    // Admin web và Mod web KHÔNG được phép sửa thông tin Clan!
    if (!isClanLeader && !isClanMod && !isOwner) {
      return NextResponse.json(
        { error: 'Chỉ Leader, Quản trị viên Clan hoặc Owner website mới có quyền chỉnh sửa Clan.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Tính SP để kiểm tra quyền dùng gradient (chỉ Tier 2 trở lên)
    const synced = await syncAndGetClanSp(clan.id);
    const tierInfo = getClanTier(synced?.totalSp || 0);

    const updateData: any = {};
    if (body.description !== undefined) updateData.description = clipText(body.description, 1000)?.trim() || null;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = clipText(body.avatarUrl, 500)?.trim() || null;
    if (body.coverUrl !== undefined) updateData.coverUrl = clipText(body.coverUrl, 500)?.trim() || null;
    if (body.color !== undefined) updateData.color = clipText(body.color, 30)?.trim() || '#0ea5e9';
    if (body.videoUrl !== undefined) updateData.videoUrl = clipText(body.videoUrl, 200)?.trim() || null;
    if (body.favoriteLevelId !== undefined) updateData.favoriteLevelId = body.favoriteLevelId || null;
    if (body.themeColor !== undefined) updateData.themeColor = clipText(body.themeColor, 30)?.trim() || null;

    if (tierInfo.tier >= 2) {
      if (body.colorGradient !== undefined) updateData.colorGradient = clipText(body.colorGradient, 100)?.trim() || null;
      if (body.themeGradient !== undefined) updateData.themeGradient = clipText(body.themeGradient, 100)?.trim() || null;
    }

    // Chỉ Leader hoặc Owner mới được đổi tên clan
    if (body.name !== undefined && (isClanLeader || isOwner)) {
      const nextName = clipText(body.name, 40).trim();
      if (nextName.length >= 2) updateData.name = nextName;
    }

    const updated = await prisma.clan.update({
      where: { id: clan.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, clan: updated });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi cập nhật thông tin Clan.');
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
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
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const member = clan.members[0];
    const isClanLeader = member?.role === 'LEADER';
    const isWebAdmin = isFullAdminRole(auth.role) || isSuperAdminUser(auth);

    // QUY TẮC: Chỉ Leader Clan hoặc Admin web mới có thể huỷ clan
    if (!isClanLeader && !isWebAdmin) {
      return NextResponse.json(
        { error: 'Chỉ Leader của Clan hoặc Admin website mới có quyền giải tán Clan này.' },
        { status: 403 }
      );
    }

    await prisma.clan.delete({
      where: { id: clan.id },
    });

    return NextResponse.json({ success: true, message: 'Đã giải tán Clan.' });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi huỷ Clan.');
  }
}
