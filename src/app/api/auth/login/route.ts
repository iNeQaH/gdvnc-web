import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, identifier, password, locale } = await req.json();
    const loginInput = (identifier || username || '').trim();
    const en = locale === 'en';

    if (!loginInput || !password) {
      return NextResponse.json({ error: en ? 'Please enter your username/email and password.' : 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.' }, { status: 400 });
    }

    // Find user by username OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: loginInput },
          { email: loginInput.toLowerCase() },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: en ? 'Incorrect username / email or password.' : 'Tên người dùng / Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: en ? 'Incorrect username / email or password.' : 'Tên người dùng / Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    // Return safe user object
    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      discordTag: user.discordTag,
      gdUsername: user.gdUsername,
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
