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
      easterEggCode: true,
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

  let easterEggCode = user.easterEggCode;
  if (!easterEggCode && (user.easterEggCompleted || user.easterEggPoints >= 100)) {
    const rc = await prisma.redeemCode.findFirst({
      where: { createdById: user.id, rewardType: 'GLITCH_THEME' },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });
    if (rc) {
      easterEggCode = rc.code;
      await prisma.user.update({
        where: { id: user.id },
        data: { easterEggCode: rc.code },
      }).catch(() => {});
    }
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
      easterEggCode: easterEggCode || null,
      clanMember,
      isSuperAdmin: isSuperAdminUser(user),
    },
  });
}
