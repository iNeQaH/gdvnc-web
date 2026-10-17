import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isSuperAdminUser } from '@/lib/roles';

export async function GET() {
  const session = await getSessionUser();
  if (!session?.userId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      role: true,
      avatarUrl: true,
      discordTag: true,
      gdUsername: true,
      gdVerified: true,
      classicPp: true,
      platformerPp: true,
      creatorPoints: true,
      spPoints: true,
      supporterUntil: true,
      profileTheme: true,
      profileConfig: true,
      nameColor: true,
      nameGradient: true,
      nameGlow: true,
      nameFont: true,
      tokenVersion: true,
      clanMember: {
        select: {
          role: true,
          clan: {
            select: {
              id: true,
              name: true,
              tag: true,
              slug: true,
              color: true,
              colorGradient: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { tokenVersion: _tokenVersion, ...publicUser } = user;
  return NextResponse.json({
    success: true,
    user: {
      ...publicUser,
      isSuperAdmin: isSuperAdminUser(user),
    },
  });
}
