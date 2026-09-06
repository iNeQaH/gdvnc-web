import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const jwt = await getAuthUser();
  if (!jwt?.userId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: jwt.userId },
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

  if (!user || (jwt.tokenVersion ?? 0) !== user.tokenVersion) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { tokenVersion: _tokenVersion, ...publicUser } = user;
  return NextResponse.json({ success: true, user: publicUser });
}
