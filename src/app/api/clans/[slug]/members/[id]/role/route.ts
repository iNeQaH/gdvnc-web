import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperAdminUser } from '@/lib/roles';
import { publicApiError } from '@/lib/apiError';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { slug, id: targetMemberId } = await params;
    const clan = await prisma.clan.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        members: { where: { userId: auth.userId } },
      },
    });
    if (!clan) return NextResponse.json({ error: 'Không tìm thấy Clan.' }, { status: 404 });

    const member = clan.members[0];
    const isClanLeader = member?.role === 'LEADER';
    const isOwner = isSuperAdminUser(auth);

    if (!isClanLeader && !isOwner) {
      return NextResponse.json(
        { error: 'Chỉ Leader của Clan mới có quyền bổ nhiệm hoặc gỡ Quản trị viên Clan.' },
        { status: 403 }
      );
    }

    const target = await prisma.clanMember.findUnique({
      where: { id: targetMemberId },
    });
    if (!target || target.clanId !== clan.id) {
      return NextResponse.json({ error: 'Không tìm thấy thành viên này trong Clan.' }, { status: 404 });
    }

    if (target.role === 'LEADER') {
      return NextResponse.json({ error: 'Không thể thay đổi quyền của Leader tại đây.' }, { status: 400 });
    }

    const body = await req.json();
    const newRole = body.role === 'MODERATOR' ? 'MODERATOR' : 'MEMBER';

    const updated = await prisma.clanMember.update({
      where: { id: targetMemberId },
      data: { role: newRole },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    return publicApiError(error, 'Lỗi khi thay đổi quyền thành viên.');
  }
}
