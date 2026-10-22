import { isBrowserSameOriginFetch } from '@/lib/origin';
import { requireAuth, getSessionUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateUserSp, getClanTier, syncAndGetClanSp } from '@/lib/clan';
import { isFullAdminRole, isSuperAdminUser } from '@/lib/roles';
import { clipText, isHttpsUrl } from '@/lib/validate';
import { publicApiError } from '@/lib/apiError';
import { isAllowedImageRef } from '@/lib/uploadthing';
import { clearLeaderboardCache } from '@/lib/leaderboard';
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
            nameGlow: true,
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
                creatorPoints: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        contributions: {
          include: {
            user: {
              select: {
                id: true,
                supporterUntil: true,
                spGrants: { select: { amount: true, expiresAt: true } },
              },
            },
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
            supporterUntil: true,
            nameColor: true,
            nameGradient: true,
            nameGlow: true,
            nameFont: true,
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

    // 2. Lấy TẤT CẢ các level được tạo và được đánh giá của các thành viên trong Clan
    // Bao gồm cả level từ CreatorWork (đã duyệt trong admin/creator) lẫn Level có sẵn trong hệ thống được tạo bởi thành viên
    const clanMembersList = await prisma.user.findMany({
      where: { id: { in: memberUserIds } },
      select: {
        id: true,
        username: true,
        gdUsername: true,
        avatarUrl: true,
        supporterUntil: true,
        nameColor: true,
        nameGradient: true,
        nameGlow: true,
        nameFont: true,
      },
    });

    const userById = new Map<string, any>();
    const userByName = new Map<string, any>();
    const allMemberNamesSet = new Set<string>();

    for (const u of clanMembersList) {
      userById.set(u.id, u);
      if (u.username?.trim()) {
        userByName.set(u.username.trim().toLowerCase(), u);
        allMemberNamesSet.add(u.username.trim());
      }
      if (u.gdUsername?.trim()) {
        userByName.set(u.gdUsername.trim().toLowerCase(), u);
        allMemberNamesSet.add(u.gdUsername.trim());
      }
    }
    const allMemberNames = Array.from(allMemberNamesSet);

    // 2.1. Lấy CreatorWork đã duyệt của thành viên clan
    const creatorWorks = await prisma.creatorWork.findMany({
      where: {
        userId: { in: memberUserIds },
        status: RecordStatus.APPROVED,
      },
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
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 50,
    });

    // 2.2. Lấy TẤT CẢ các level trong cơ sở dữ liệu được tạo bởi thành viên Clan (theo creatorId hoặc creatorName)
    // và có đánh giá / rating (RATED, FEATURED, EPIC, LEGENDARY, MYTHIC hoặc difficulty > 0)
    const dbMemberLevels = await prisma.level.findMany({
      where: {
        OR: [
          { creatorId: { in: memberUserIds } },
          ...allMemberNames.map((name) => ({
            creatorName: { equals: name, mode: 'insensitive' as const },
          })),
        ],
        AND: [
          {
            OR: [
              { ratingType: { not: 'NONE' } },
              { difficultyFace: { gt: 0 } },
              { basePp: { gt: 0 } },
              { isVN: true },
              { isChallenge: true },
            ],
          },
        ],
      },
      select: {
        id: true,
        gdLevelId: true,
        name: true,
        difficulty: true,
        difficultyFace: true,
        ratingType: true,
        youtubeId: true,
        creatorName: true,
        creatorId: true,
        mode: true,
        basePp: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    // 2.3. Hợp nhất và chuẩn hóa danh sách Featured Creator Works
    const worksByGdId = new Map<number, any>();
    const dbLevelByGdId = new Map<number, any>();
    for (const lvl of dbMemberLevels) {
      if (lvl.gdLevelId) dbLevelByGdId.set(lvl.gdLevelId, lvl);
    }

    // Nạp thêm bất kỳ Level nào trong DB khớp với gdLevelId của CreatorWorks (nếu chưa có trong dbMemberLevels)
    const cwGdIds = creatorWorks
      .map((w) => w.gdLevelId)
      .filter((id): id is number => typeof id === 'number' && id > 0 && !dbLevelByGdId.has(id));

    if (cwGdIds.length > 0) {
      const extraLevels = await prisma.level.findMany({
        where: { gdLevelId: { in: cwGdIds } },
        select: {
          id: true,
          gdLevelId: true,
          name: true,
          difficulty: true,
          difficultyFace: true,
          ratingType: true,
          youtubeId: true,
          creatorName: true,
          creatorId: true,
          mode: true,
          basePp: true,
          createdAt: true,
        },
      });
      for (const lvl of extraLevels) {
        if (lvl.gdLevelId) dbLevelByGdId.set(lvl.gdLevelId, lvl);
      }
    }

    // A. Nạp từ CreatorWorks
    for (const work of creatorWorks) {
      const dbLvl = work.gdLevelId ? dbLevelByGdId.get(work.gdLevelId) : null;
      const effectiveRating = work.ratingType && work.ratingType !== 'NONE' ? work.ratingType : (dbLvl?.ratingType || 'NONE');
      const ytMatch = work.videoUrl
        ? work.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/)
        : null;
      const effectiveYtId = dbLvl?.youtubeId || (ytMatch ? ytMatch[1] : null);
      const effectiveLevelName = work.levelName || dbLvl?.name || null;
      const item = {
        ...work,
        levelName: effectiveLevelName,
        name: effectiveLevelName,
        creatorName: dbLvl?.creatorName || work.username || work.user?.username,
        youtubeId: effectiveYtId,
        levelId: dbLvl?.id || null,
        difficultyFace: work.difficultyFace || dbLvl?.difficultyFace || 0,
        ratingType: effectiveRating,
        matchedLevel: dbLvl || null,
      };
      if (work.gdLevelId) {
        worksByGdId.set(work.gdLevelId, item);
      }
    }

    // B. Nạp từ dbMemberLevels (những level có sẵn trong hệ thống ghép tác giả vào username của thành viên clan)
    for (const lvl of dbMemberLevels) {
      if (!lvl.gdLevelId || !worksByGdId.has(lvl.gdLevelId)) {
        const author = (lvl.creatorId ? userById.get(lvl.creatorId) : null)
          || (lvl.creatorName ? userByName.get(lvl.creatorName.trim().toLowerCase()) : null)
          || rawClan.leader;

        const item = {
          id: `lvl-${lvl.id}`,
          name: lvl.name,
          levelName: lvl.name,
          creatorName: lvl.creatorName || author?.username || author?.gdUsername,
          description: null,
          gdLevelId: lvl.gdLevelId,
          youtubeId: lvl.youtubeId || null,
          videoUrl: lvl.youtubeId ? `https://youtube.com/watch?v=${lvl.youtubeId}` : null,
          imageUrl: lvl.youtubeId ? `https://img.youtube.com/vi/${lvl.youtubeId}/maxresdefault.jpg` : null,
          ratingType: lvl.ratingType || 'NONE',
          difficultyFace: lvl.difficultyFace || 0,
          levelId: lvl.id,
          matchedLevel: lvl,
          user: author,
          createdAt: lvl.createdAt,
        };
        if (lvl.gdLevelId) {
          worksByGdId.set(lvl.gdLevelId, item);
        }
      }
    }

    // C. Sắp xếp tác phẩm: Phẩm chất cao nhất (MYTHIC > LEGENDARY > EPIC > FEATURED > RATED) lên đầu
    const RATING_WEIGHTS: Record<string, number> = {
      MYTHIC: 5,
      LEGENDARY: 4,
      EPIC: 3,
      FEATURED: 2,
      RATED: 1,
      NONE: 0,
    };

    const enrichedCreatorWorks = Array.from(worksByGdId.values()).sort((a, b) => {
      const weightA = RATING_WEIGHTS[a.ratingType] || 0;
      const weightB = RATING_WEIGHTS[b.ratingType] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return (b.gdLevelId || 0) - (a.gdLevelId || 0);
    }).slice(0, 50);

    // 3. Phân chia danh sách thành viên theo quyền hạn & đóng góp SP
    // SP đóng góp của từng thành viên tự động clamp theo số SP tối đa hiện có (nếu hết supporter thì bằng 0)
    const contribMap = new Map<string, number>();
    for (const c of rawClan.contributions) {
      const userMax = calculateUserSp(c.user);
      const validPledge = Math.min(c.spPledged, userMax);
      if (validPledge > 0) contribMap.set(c.userId, validPledge);
    }

    const mapMember = (m: any) => ({
      ...m,
      spPledged: contribMap.get(m.userId) || 0,
    });

    const leaderRaw = rawClan.members.find((m) => m.role === 'LEADER');
    const leaderMember = leaderRaw ? mapMember(leaderRaw) : null;
    const modMembers = rawClan.members.filter((m) => m.role === 'MODERATOR').map(mapMember);
    const nonModMembers = rawClan.members.filter((m) => m.role === 'MEMBER').map(mapMember);
    const contributorMembers = nonModMembers.filter((m) => (m.spPledged || 0) > 0);
    const regularMembers = nonModMembers.filter((m) => (m.spPledged || 0) <= 0);

    // 4. Kiểm tra trạng thái của người đang xem
    let myMembership = null;
    let myPendingRequest = null;
    let pendingRequests: any[] = [];
    let myPledge = 0;
    if (sessionUser) {
      myMembership = rawClan.members.find((m) => m.userId === sessionUser.userId) || null;
      const myContrib = rawClan.contributions.find((c) => c.userId === sessionUser.userId);
      const myMax = myContrib ? calculateUserSp(myContrib.user) : 0;
      myPledge = myContrib ? Math.min(myContrib.spPledged, myMax) : 0;
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
                nameGlow: true,
                nameFont: true,
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
          contributors: contributorMembers,
          members: regularMembers,
        },
        myMembership,
        myPendingRequest,
        pendingRequests,
        myPledge,
        createdAt: rawClan.createdAt,
      },
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi tải thông tin Clan.');
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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
          include: {
            user: {
              select: {
                supporterUntil: true,
                spGrants: {
                  select: { amount: true, expiresAt: true },
                },
              },
            },
          },
        },
      },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const member = clan.members[0];
    const isClanLeader = member?.role === 'LEADER';
    const isOwner = isSuperAdminUser(auth);

    // QUY TẮC BẢO MẬT: Chỉ Leader Clan hoặc Owner Web mới được sửa thông tin Clan.
    // Mod Clan, Admin web và Mod web KHÔNG được phép sửa thông tin Clan!
    if (!isClanLeader && !isOwner) {
      return NextResponse.json(
        { error: 'Chỉ Leader của Clan hoặc Owner website mới có quyền chỉnh sửa cài đặt Clan.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Tính SP để kiểm tra quyền dùng gradient (chỉ Tier 2 trở lên)
    const synced = await syncAndGetClanSp(clan.id);
    const tierInfo = getClanTier(synced?.totalSp || 0);

    const updateData: any = {};
    if (body.description !== undefined) updateData.description = clipText(body.description, 1000)?.trim() || null;

    if (body.avatarUrl !== undefined) {
      const av = clipText(body.avatarUrl, 500)?.trim() || null;
      if (av && !isAllowedImageRef(av)) {
        return NextResponse.json({ error: 'URL ảnh đại diện Clan không hợp lệ.' }, { status: 400 });
      }
      updateData.avatarUrl = av;
    }

    if (body.coverUrl !== undefined) {
      const cv = clipText(body.coverUrl, 500)?.trim() || null;
      if (cv && !isAllowedImageRef(cv)) {
        return NextResponse.json({ error: 'URL ảnh bìa Clan không hợp lệ.' }, { status: 400 });
      }
      updateData.coverUrl = cv;
    }

    if (body.color !== undefined) {
      const c = clipText(body.color, 30)?.trim() || '#0ea5e9';
      updateData.color = (c.length > 50 || /[;<>{}]/.test(c)) ? '#0ea5e9' : c;
    }

    if (body.videoUrl !== undefined) {
      const vid = clipText(body.videoUrl, 200)?.trim() || null;
      if (vid && !isHttpsUrl(vid)) {
        return NextResponse.json({ error: 'URL video Clan phải là đường dẫn HTTPS hợp lệ.' }, { status: 400 });
      }
      updateData.videoUrl = vid;
    }

    if (body.favoriteLevelId !== undefined) {
      const rawFav = String(body.favoriteLevelId || '').trim();
      if (!rawFav) {
        updateData.favoriteLevelId = null;
      } else {
        const parsedGdId = /^\d+$/.test(rawFav) ? parseInt(rawFav, 10) : null;
        const foundLevel = await prisma.level.findFirst({
          where: parsedGdId
            ? { OR: [{ gdLevelId: parsedGdId }, { id: rawFav }] }
            : { OR: [{ id: rawFav }, { name: { equals: rawFav, mode: 'insensitive' } }] },
          select: { id: true },
        });
        if (!foundLevel) {
          return NextResponse.json(
            { error: 'Không tìm thấy màn chơi này trên danh sách GDVN. Vui lòng nhập đúng GD Level ID có trong danh sách.' },
            { status: 400 }
          );
        }
        updateData.favoriteLevelId = foundLevel.id;
      }
    }

    if (body.themeColor !== undefined) {
      const tc = clipText(body.themeColor, 60)?.trim() || null;
      updateData.themeColor = (tc && (tc.length > 80 || /[;<>{}]/.test(tc.replace(/\/\*glow:\d+:\d+\*\//g, '')))) ? null : tc;
    }

    if (tierInfo.tier >= 2) {
      if (body.colorGradient !== undefined) {
        const cg = clipText(body.colorGradient, 100)?.trim() || null;
        updateData.colorGradient = (cg && (cg.length > 120 || /[;<>{}]/.test(cg))) ? null : cg;
      }
      if (body.themeGradient !== undefined) {
        const tg = clipText(body.themeGradient, 160)?.trim() || null;
        updateData.themeGradient = (tg && (tg.length > 200 || /[;<>{}]/.test(tg.replace(/\/\*glow:\d+:\d+\*\//g, '')))) ? null : tg;
      }
    }

    // Yêu cầu: Clan phải lên Tier 3 mới có Glow trong settings
    if (tierInfo.tier < 3) {
      if (updateData.themeGradient) {
        updateData.themeGradient = updateData.themeGradient.replace(/\/\*glow:\d+:\d+\*\//g, '/*glow:0:70*/');
      }
      if (updateData.themeColor) {
        updateData.themeColor = updateData.themeColor.replace(/\/\*glow:\d+:\d+\*\//g, '/*glow:0:70*/');
      }
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

    clearLeaderboardCache();

    return NextResponse.json({ success: true, clan: updated });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi cập nhật thông tin Clan.');
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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

    clearLeaderboardCache();

    return NextResponse.json({ success: true, message: 'Đã giải tán Clan.' });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi huỷ Clan.');
  }
}
