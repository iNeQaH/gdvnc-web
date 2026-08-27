import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { isMailConfigured, sendOtpEmail } from '@/lib/mail';
import { verifyCaptchaToken } from '@/lib/captcha';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limited = rateLimit(`otp:${ip}`, 5, 10 * 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const { email, locale, captchaToken } = await req.json();
    const lang = locale === 'en' ? 'en' : 'vi';

    if (!verifyCaptchaToken(captchaToken)) {
      return NextResponse.json(
        { error: lang === 'en' ? 'Anti-bot verification required.' : 'Vui lòng xác thực chống bot trước.' },
        { status: 400 }
      );
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: lang === 'en' ? 'Invalid email address.' : 'Email không hợp lệ.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            lang === 'en'
              ? 'This email is already used by another account.'
              : 'Email này đã được sử dụng cho một tài khoản khác.',
        },
        { status: 400 }
      );
    }

    if (!isMailConfigured()) {
      return NextResponse.json(
        {
          error:
            lang === 'en'
              ? 'Email sending is not configured. Set SMTP_USER and SMTP_PASS in .env'
              : 'Hệ thống gửi email chưa được cấu hình. Hãy điền SMTP_USER và SMTP_PASS trong file .env',
        },
        { status: 503 }
      );
    }

    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otp.deleteMany({
      where: { email: cleanEmail },
    });

    await prisma.otp.create({
      data: {
        email: cleanEmail,
        code: otpCode,
        expiresAt,
      },
    });

    try {
      await sendOtpEmail(cleanEmail, otpCode, lang);
    } catch (mailErr: any) {
      await prisma.otp.deleteMany({ where: { email: cleanEmail } });
      console.error('SMTP sending error:', mailErr);
      return NextResponse.json(
        {
          error:
            lang === 'en'
              ? `Failed to send email: ${mailErr.message || 'SMTP error'}`
              : `Không gửi được email: ${mailErr.message || 'Lỗi SMTP'}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        lang === 'en'
          ? `A verification code was sent to ${cleanEmail}. Please check your inbox (and spam folder).`
          : `Đã gửi mã xác nhận tới ${cleanEmail}. Vui lòng kiểm tra hộp thư (kể cả mục spam)!`,
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi gửi mã OTP.' },
      { status: 500 }
    );
  }
}
