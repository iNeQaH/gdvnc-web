import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, otp, password, locale } = await req.json();
    const en = locale === 'en';

    if (!email || !otp || !password) {
      return NextResponse.json(
        { error: en ? 'Please fill in all fields.' : 'Vui lòng điền đầy đủ thông tin.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: en ? 'Password must be at least 6 characters.' : 'Mật khẩu phải có ít nhất 6 ký tự.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return NextResponse.json(
        { error: en ? 'Account not found.' : 'Không tìm thấy tài khoản.' },
        { status: 404 }
      );
    }

    const validOtp = await prisma.otp.findFirst({
      where: {
        email: cleanEmail,
        code: cleanOtp,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return NextResponse.json(
        { error: en ? 'OTP is incorrect or has expired.' : 'Mã OTP không đúng hoặc đã hết hạn.' },
        { status: 400 }
      );
    }

    await prisma.otp.deleteMany({ where: { email: cleanEmail } });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: en ? 'Password updated successfully. You can log in now.' : 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi đặt lại mật khẩu.' }, { status: 500 });
  }
}
