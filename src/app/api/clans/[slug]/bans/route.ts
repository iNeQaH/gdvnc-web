import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperAdminUser } from '@/lib/roles';
import { clipText } from '@/lib/validate';
import { publicApiError } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
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
    const isClanMod = member?.role === 'MODERATOR';
    const isOwner = isSuperAdminUser(auth);

    if (!isClanLeader && !isClanMod && !isOwner) {
      return NextResponse.json({ error: 'Không có quyền xem danh sách chặn.' }, { status: 403 });
    }

    // Dọn dẹp các ban đã hết hạn
    const now = new Date();
    await prisma.$executeRaw`
      DELETE FROM "ClanBan"
      WHERE "clanId" = ${clan.id} AND "expiresAt" IS NOT NULL AND "expiresAt" < ${now}
    `;

    // Lấy danh sách đang bị chặn
    const bans = await prisma.$queryRaw<Array<{
      id: string;
      clanId: string;
      userId: string;
      reason: string | null;
      bannedById: string | null;
      expiresAt: Date | null;
      createdAt: Date;
      username: string;
      avatarUrl: string | null;
      bannedByUsername: string | null;
    }>>`
      SELECT 
        b.id,
        b."clanId",
        b."userId",
        b.reason,
        b."bannedById",
        b."expiresAt",
        b."createdAt",
        u.username,
        u."avatarUrl",
        bb.username as "bannedByUsername"
      FROM "ClanBan" b
      LEFT JOIN "User" u ON b."userId" = u.id
      LEFT JOIN "User" bb ON b."bannedById" = bb.id
      WHERE b."clanId" = ${clan.id}
      ORDER BY b."createdAt" DESC
    `;

    return NextResponse.json({ success: true, bans });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi tải danh sách chặn.');
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
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const member = clan.members[0];
    const isClanLeader = member?.role === 'LEADER';
    const isClanMod = member?.role === 'MODERATOR';
    const isOwner = isSuperAdminUser(auth);

    if (!isClanLeader && !isClanMod && !isOwner) {
      return NextResponse.json(
        { error: 'Chỉ Leader hoặc Moderator mới có quyền chặn thành viên khỏi Clan.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const targetUserId = body.userId?.trim();
    const targetUsername = body.username?.trim();
    const durationDays = typeof body.days === 'number' ? body.days : null; // null = permanent
    const reason = clipText(body.reason, 200)?.trim() || null;

    let targetUser: { id: string; username: string } | null = null;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, username: true },
      });
    } else if (targetUsername) {
      targetUser = await prisma.user.findFirst({
        where: { username: { equals: targetUsername, mode: 'insensitive' } },
        select: { id: true, username: true },
      });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng cần chặn.' }, { status: 404 });
    }

    if (targetUser.id === auth.userId) {
      return NextResponse.json({ error: 'Bạn không thể tự chặn chính mình.' }, { status: 400 });
    }

    if (targetUser.id === clan.leaderId) {
      return NextResponse.json({ error: 'Không thể chặn Trưởng Clan (Leader).' }, { status: 400 });
    }

    // Nếu người thực hiện là Clan Mod, không được chặn Mod khác hoặc Leader
    if (isClanMod && !isClanLeader && !isOwner) {
      const targetMember = await prisma.clanMember.findUnique({
        where: { userId: targetUser.id },
      });
      if (targetMember?.role === 'MODERATOR' || targetMember?.role === 'LEADER') {
        return NextResponse.json(
          { error: 'Quản trị viên không thể chặn Quản trị viên khác hoặc Leader.' },
          { status: 403 }
        );
      }
    }

    const expiresAt =
      durationDays && durationDays > 0
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : null;

    // Trục xuất khỏi clan nếu đang là thành viên
    await prisma.$transaction(async (tx) => {
      await tx.clanMember.deleteMany({
        where: { clanId: clan.id, userId: targetUser.id },
      });
      await tx.clanSpContribution.deleteMany({
        where: { clanId: clan.id, userId: targetUser.id },
      });
      await tx.clanJoinRequest.deleteMany({
        where: { clanId: clan.id, userId: targetUser.id },
      });
    });

    // Thêm vào ClanBan (Upsert bằng query raw an toàn)
    await prisma.$executeRaw`
      INSERT INTO "ClanBan" ("id", "clanId", "userId", "reason", "bannedById", "expiresAt", "createdAt")
      VALUES (gen_random_uuid(), ${clan.id}, ${targetUser.id}, ${reason}, ${auth.userId}, ${expiresAt}, CURRENT_TIMESTAMP)
      ON CONFLICT ("clanId", "userId")
      DO UPDATE SET
        "reason" = EXCLUDED.reason,
        "bannedById" = EXCLUDED."bannedById",
        "expiresAt" = EXCLUDED."expiresAt",
        "createdAt" = CURRENT_TIMESTAMP
    `;

    // Gửi thông báo đến mailbox người bị chặn
    try {
      const durationText = expiresAt
        ? `trong ${durationDays} ngày (đến ${expiresAt.toLocaleDateString('vi-VN')})`
        : 'vĩnh viễn';
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          title: `Bị chặn khỏi Clan [${clan.tag}]`,
          message: `Bạn đã bị chặn tham gia Clan [${clan.tag}] ${clan.name} ${durationText}.${reason ? ` Lý do: ${reason}` : ''}`,
        },
      });
    } catch (e) {
      console.warn('Notification to banned user failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Đã chặn ${targetUser.username} khỏi Clan ${durationDays ? `trong ${durationDays} ngày` : 'vĩnh viễn'}.`,
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi chặn người dùng khỏi Clan.');
  }
}
