import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateUserSp, getClanTier, syncAndGetClanSp } from '@/lib/clan';
import { isFullAdminRole, isStaffRole, isSuperAdminUser } from '@/lib/roles';
import { clipText } from '@/lib/validate';
import { publicApiError } from '@/lib/apiError';
import { isAllowedImageRef } from '@/lib/uploadthing';
import { clearLeaderboardCache } from '@/lib/leaderboard';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim().toLowerCase();
    const sort = searchParams.get('sort') || 'sp';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    const clans = await prisma.clan.findMany({
      include: {
        leader: {
          select: { id: true, username: true, avatarUrl: true, supporterUntil: true },
        },
        members: {
          select: { userId: true },
        },
        contributions: {
          include: {
            user: {
              select: {
                id: true,
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

    const now = new Date();

    // Tính toán SP, Tier, và trạng thái cho từng Clan
    const clanList = clans.map((c) => {
      const memberIds = new Set(c.members.map((m) => m.userId));
      let totalSp = 0;
      for (const contrib of c.contributions) {
        if (!memberIds.has(contrib.userId)) continue;
        const userMax = calculateUserSp(contrib.user);
        totalSp += Math.min(contrib.spPledged, userMax);
      }

      const tierInfo = getClanTier(totalSp);
      const isSuspended = c.isSuspended || (totalSp < 3 && c.gracePeriodUntil && new Date(c.gracePeriodUntil) < now);

      return {
        id: c.id,
        name: c.name,
        tag: c.tag,
        slug: c.slug,
        description: c.description,
        avatarUrl: c.avatarUrl,
        coverUrl: c.coverUrl,
        color: c.color,
        colorGradient: tierInfo.tier >= 2 ? c.colorGradient : null,
        themeColor: c.themeColor,
        themeGradient: tierInfo.tier >= 2 ? c.themeGradient : null,
        totalSp,
        effectiveSp: totalSp,
        tier: tierInfo.tier,
        tierName: tierInfo.name,
        maxMembers: tierInfo.maxMembers,
        memberCount: c.members.length,
        _count: { members: c.members.length },
        isSuspended,
        gracePeriodUntil: c.gracePeriodUntil,
        leader: {
          id: c.leader.id,
          username: c.leader.username,
          avatarUrl: c.leader.avatarUrl,
        },
        createdAt: c.createdAt,
      };
    });

    // Lọc theo từ khóa
    let filtered = clanList;
    if (q) {
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q)
      );
    }

    // Sắp xếp
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sort === 'members') cmp = b.memberCount - a.memberCount;
      else if (sort === 'oldest') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sort === 'newest') cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      else cmp = (b.totalSp - a.totalSp) || (b.memberCount - a.memberCount); // mặc định: SP Coin cao nhất

      return order === 'asc' ? -cmp : cmp;
    });

    return NextResponse.json({ success: true, clans: filtered });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi tải danh sách Clan.');
  }
}

export async function POST(req: Request) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }

  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  const limited = rateLimit(`create-clan:${auth.userId}`, 4, 300_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        username: true,
        role: true,
        supporterUntil: true,
        spGrants: {
          orderBy: { expiresAt: 'asc' },
          select: { id: true, amount: true, expiresAt: true },
        },
      },
    });
    if (!user) return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });

    const isSupporter = Boolean(user.supporterUntil && new Date(user.supporterUntil) > new Date());
    const isStaff = isStaffRole(user.role);
    const userSp = calculateUserSp(user);

    if (!isSupporter && userSp < 3 && !isStaff) {
      return NextResponse.json(
        { error: 'Bạn cần ít nhất 3 SP Coin (hoặc gói Supporter tương ứng) để thành lập Clan.' },
        { status: 403 }
      );
    }

    if (userSp < 3 && !isStaff) {
      return NextResponse.json(
        { error: `Bạn cần ít nhất 3 SP Coin để tạo Clan. Hiện bạn có ${userSp} SP Coin.` },
        { status: 400 }
      );
    }

    // Kiểm tra xem người dùng đã thuộc clan nào chưa
    const existingMember = await prisma.clanMember.findUnique({
      where: { userId: user.id },
      include: { clan: { select: { name: true, tag: true } } },
    });
    if (existingMember) {
      return NextResponse.json(
        { error: `Bạn đã tham gia Clan [${existingMember.clan.tag}] ${existingMember.clan.name}. Cần rời clan cũ trước.` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const name = clipText(body.name, 40).trim();
    const tag = clipText(body.tag, 4).trim().toUpperCase();
    const description = clipText(body.description, 500)?.trim() || null;
    let color = (body.color || '#0ea5e9').trim();
    if (color.length > 50 || /[;<>{}]/.test(color)) {
      color = '#0ea5e9';
    }
    const avatarUrlRaw = clipText(body.avatarUrl, 500)?.trim() || null;
    const coverUrlRaw = clipText(body.coverUrl, 500)?.trim() || null;

    if (avatarUrlRaw && !isAllowedImageRef(avatarUrlRaw)) {
      return NextResponse.json({ error: 'URL ảnh đại diện Clan không hợp lệ.' }, { status: 400 });
    }
    if (coverUrlRaw && !isAllowedImageRef(coverUrlRaw)) {
      return NextResponse.json({ error: 'URL ảnh bìa Clan không hợp lệ.' }, { status: 400 });
    }

    const avatarUrl = avatarUrlRaw;
    const coverUrl = coverUrlRaw;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Tên Clan phải từ 2 đến 40 ký tự.' }, { status: 400 });
    }
    if (!tag || tag.length < 2 || tag.length > 4 || !/^[A-Z0-9]+$/.test(tag)) {
      return NextResponse.json({ error: 'Tên viết tắt (Tag) phải từ 2 đến 4 ký tự chữ hoặc số.' }, { status: 400 });
    }

    // Tạo slug từ tag
    const slug = tag.toLowerCase();

    // Kiểm tra trùng lặp
    const dup = await prisma.clan.findFirst({
      where: {
        OR: [{ name: { equals: name, mode: 'insensitive' } }, { tag }, { slug }],
      },
    });
    if (dup) {
      return NextResponse.json({ error: 'Tên hoặc Tag Clan này đã được sử dụng.' }, { status: 400 });
    }

    // Khởi tạo Clan, tự động gán người tạo làm LEADER và đóng góp 3 SP khởi tạo vào Clan
    // Không xóa UserSpGrant và không trừ thời hạn supporterUntil của người dùng
    const initialPledge = Math.max(0, Math.min(userSp, 3));
    const newClan = await prisma.$transaction(async (tx) => {
      const c = await tx.clan.create({
        data: {
          name,
          tag,
          slug,
          description,
          color,
          avatarUrl,
          coverUrl,
          leaderId: user.id,
        },
      });

      await tx.clanMember.create({
        data: {
          clanId: c.id,
          userId: user.id,
          role: 'LEADER',
        },
      });

      if (initialPledge > 0) {
        await tx.clanSpContribution.upsert({
          where: { userId: user.id },
          create: {
            clanId: c.id,
            userId: user.id,
            spPledged: initialPledge,
          },
          update: {
            clanId: c.id,
            spPledged: initialPledge,
          },
        });
      }

      return c;
    });

    await syncAndGetClanSp(newClan.id);
    clearLeaderboardCache();

    return NextResponse.json({
      success: true,
      clan: newClan,
      user: {
        ...user,
        supporterUntil: user.supporterUntil,
      },
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi tạo Clan.');
  }
}
