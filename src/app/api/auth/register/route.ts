import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, setAuthCookie } from '@/lib/auth';
import { Role } from '@prisma/client';
import { isHoneypotFilled } from '@/lib/captcha';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    if (!isBrowserSameOriginFetch(req)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
    }

    const limited = rateLimit(`register:${getClientIp(req)}`, 3, 60 * 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const { username, email, otp, password, gdUsername, discordTag, locale, website } = await req.json();
    const en = locale === 'en';

    if (isHoneypotFilled(website)) {
      return NextResponse.json({ error: en ? 'Please try again.' : 'Vui lòng thử lại.' }, { status: 400 });
    }

    if (!username || !password) {
      return NextResponse.json({ error: en ? 'Please enter a username and password.' : 'Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.' }, { status: 400 });
    }

    if (!email || !otp) {
      return NextResponse.json({ error: en ? 'Please enter email and OTP code.' : 'Vui lòng nhập email và mã xác nhận OTP.' }, { status: 400 });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (cleanUsername.length < 1) {
      return NextResponse.json({ error: en ? 'Username must be at least 1 character.' : 'Tên người dùng phải có ít nhất 1 ký tự.' }, { status: 400 });
    }

    const cleanGd = typeof gdUsername === 'string' ? gdUsername.trim() : '';

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: en ? 'Password must be 6–128 characters.' : 'Mật khẩu phải từ 6 đến 128 ký tự.' }, { status: 400 });
    }

    const validOtp = await prisma.otp.findFirst({
      where: {
        email: cleanEmail,
        code: cleanOtp,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return NextResponse.json({ error: en ? 'OTP is incorrect or has expired.' : 'Mã xác nhận OTP không đúng hoặc đã hết hạn.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: 'insensitive' } },
          { email: cleanEmail },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === cleanUsername.toLowerCase()) {
        return NextResponse.json({ error: en ? 'This username is already taken.' : 'Tên người dùng đã được sử dụng.' }, { status: 400 });
      }
      return NextResponse.json({ error: en ? 'This email is already used by another account.' : 'Email đã được sử dụng cho tài khoản khác.' }, { status: 400 });
    }

    await prisma.otp.deleteMany({
      where: { email: cleanEmail },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        role: Role.USER,
        gdUsername: cleanGd || null,
        gdVerified: false,
        discordTag: discordTag?.trim() || null,
        country: en ? 'Vietnam' : 'Việt Nam',
      },
    });

    const safeUser = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl,
      discordTag: newUser.discordTag,
      gdUsername: newUser.gdUsername,
      gdVerified: newUser.gdVerified,
      classicPp: newUser.classicPp,
      platformerPp: newUser.platformerPp,
      creatorPoints: newUser.creatorPoints,
      spPoints: newUser.spPoints,
      supporterUntil: newUser.supporterUntil,
    };

    // Sign JWT and set httpOnly cookie
    const token = await signToken({ userId: newUser.id, username: newUser.username, role: newUser.role });
    await setAuthCookie(token);

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi tạo tài khoản.' }, { status: 500 });
  }
}
