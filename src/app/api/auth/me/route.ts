import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

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
      tokenVersion: true,
    },
  });

  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { tokenVersion: _tokenVersion, ...publicUser } = user;
  return NextResponse.json({ success: true, user: publicUser });
}
