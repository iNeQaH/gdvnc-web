import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, setAuthCookie } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { purgeExpiredUserEmails } from '@/lib/purgeExpiredEmails';

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`login:${getClientIp(req)}`, 8, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const { username, identifier, password, locale } = await req.json();
    const loginInput = (identifier || username || '').trim();
    const en = locale === 'en';

    if (!loginInput || !password || typeof password !== 'string') {
      return NextResponse.json({ error: en ? 'Please enter your username/email and password.' : 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.' }, { status: 400 });
    }
    if (password.length > 128) {
      return NextResponse.json({ error: en ? 'Incorrect username / email or password.' : 'Tên người dùng / Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    // Find user by username OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: loginInput, mode: 'insensitive' } },
          { email: { equals: loginInput.toLowerCase(), mode: 'insensitive' } },
        ],
      },
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
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: en ? 'Incorrect username / email or password.' : 'Tên người dùng / Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: en ? 'Incorrect username / email or password.' : 'Tên người dùng / Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    await purgeExpiredUserEmails();

    // Return safe user object
    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      discordTag: user.discordTag,
      gdUsername: user.gdUsername,
      gdVerified: user.gdVerified,
      classicPp: user.classicPp,
      platformerPp: user.platformerPp,
      creatorPoints: user.creatorPoints,
      spPoints: user.spPoints,
      supporterUntil: user.supporterUntil,
    };

    // Sign JWT and set httpOnly cookie
    const token = await signToken({ userId: user.id, username: user.username, role: user.role });
    await setAuthCookie(token);

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error.' }, { status: 500 });
  }
}
