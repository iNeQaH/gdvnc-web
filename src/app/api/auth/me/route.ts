import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isSuperAdminUser } from '@/lib/roles';
import { sanitizeUserClan } from '@/lib/clan';

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
      hasGlitchTheme: true,
      easterEggCompleted: true,
      easterEggPoints: true,
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
              isSuspended: true,
              contributions: {
                select: {
                  userId: true,
                  spPledged: true,
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
              members: {
                select: { userId: true },
              },
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
  const sanitizedClan = sanitizeUserClan(user.clanMember?.clan);
  const clanMember = user.clanMember
    ? {
        role: user.clanMember.role,
        clan: sanitizedClan,
      }
    : null;

  return NextResponse.json({
    success: true,
    user: {
      ...publicUser,
      clanMember,
      isSuperAdmin: isSuperAdminUser(user),
    },
  });
}
