import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateUserSp, getClanTier, syncAndGetClanSp } from '@/lib/clan';
import { isFullAdminRole, isStaffRole, isSuperAdminUser } from '@/lib/roles';
import { clipText } from '@/lib/validate';
import { publicApiError } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim().toLowerCase();
    const sort = searchParams.get('sort') || 'members';
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
                  where: { expiresAt: { gt: new Date() } },
                  select: { amount: true, expiresAt: true },
                },
              },
            },
          },
        },
      },
    });

    const now = new Date();

    // Tính toán SP, Tier, và trạng thái cho từng Clan (3 SP base từ phí tạo clan)
    const clanList = clans.map((c) => {
      const memberIds = new Set(c.members.map((m) => m.userId));
      let totalSp = 3;
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
      if (sort === 'sp') cmp = b.totalSp - a.totalSp;
      else if (sort === 'oldest') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sort === 'newest') cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      else cmp = b.memberCount - a.memberCount; // mặc định: đông thành viên nhất

      return order === 'asc' ? -cmp : cmp;
    });

    return NextResponse.json({ success: true, clans: filtered });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi tải danh sách Clan.');
  }
}

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        username: true,
        role: true,
        supporterUntil: true,
        spGrants: {
          where: { expiresAt: { gt: new Date() } },
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
    const color = (body.color || '#0ea5e9').trim();
    const avatarUrl = clipText(body.avatarUrl, 500)?.trim() || null;
    const coverUrl = clipText(body.coverUrl, 500)?.trim() || null;

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

    // Khởi tạo Clan và tự động gán người tạo làm LEADER
    // Trừ 3 SP Coin phí tạo Clan (ưu tiên trừ từ spGrants sắp hết hạn trước, phần còn thiếu trừ vào supporterUntil)
    const now = new Date();
    let newSupporterUntil = user.supporterUntil;
    const newClan = await prisma.$transaction(async (tx) => {
      let remainingCost = 3;
      for (const grant of user.spGrants || []) {
        if (remainingCost <= 0) break;
        const deduct = Math.min(remainingCost, grant.amount);
        if (deduct >= grant.amount) {
          await tx.userSpGrant.delete({ where: { id: grant.id } });
        } else {
          await tx.userSpGrant.update({
            where: { id: grant.id },
            data: { amount: { decrement: deduct } },
          });
        }
        remainingCost -= deduct;
      }

      if (remainingCost > 0 && user.supporterUntil) {
        const currentSupporter = new Date(user.supporterUntil);
        if (currentSupporter > now) {
          const deductedMs = remainingCost * 30 * 24 * 60 * 60 * 1000;
          const newSupporterTime = Math.max(now.getTime(), currentSupporter.getTime() - deductedMs);
          newSupporterUntil = new Date(newSupporterTime);
          await tx.user.update({
            where: { id: user.id },
            data: { supporterUntil: newSupporterUntil },
          });
        }
      }

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

      return c;
    });

    return NextResponse.json({
      success: true,
      clan: newClan,
      user: {
        ...user,
        supporterUntil: newSupporterUntil,
      },
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi tạo Clan.');
  }
}
