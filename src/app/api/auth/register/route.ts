import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, setAuthCookie } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { username, email, otp, password, gdUsername, discordTag, locale } = await req.json();
    const en = locale === 'en';

    if (!username || !password) {
      return NextResponse.json({ error: en ? 'Please enter a username and password.' : 'Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.' }, { status: 400 });
    }

    if (!email || !otp) {
      return NextResponse.json({ error: en ? 'Please enter email and OTP code.' : 'Vui lòng nhập email và mã xác nhận OTP.' }, { status: 400 });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: en ? 'Username must be at least 3 characters.' : 'Tên người dùng phải có ít nhất 3 ký tự.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: en ? 'Password must be at least 6 characters.' : 'Mật khẩu phải có ít nhất 6 ký tự.' }, { status: 400 });
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
          { username: cleanUsername },
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
        gdUsername: gdUsername?.trim() || null,
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
