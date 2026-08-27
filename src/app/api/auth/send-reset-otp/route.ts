import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { isMailConfigured, sendResetPasswordEmail } from '@/lib/mail';
import { verifyCaptchaToken } from '@/lib/captcha';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`reset-otp:${getClientIp(req)}`, 5, 10 * 60_000);
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

    if (!existing) {
      return NextResponse.json({
        success: true,
        message:
          lang === 'en'
            ? `If an account exists, a reset code was sent.`
            : `Nếu tài khoản tồn tại, mã đặt lại mật khẩu đã được gửi.`,
      });
    }

    if (!isMailConfigured()) {
      return NextResponse.json(
        {
          error:
            lang === 'en'
              ? 'Email sending is not configured.'
              : 'Hệ thống gửi email chưa được cấu hình.',
        },
        { status: 503 }
      );
    }

    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otp.deleteMany({ where: { email: cleanEmail } });

    await prisma.otp.create({
      data: { email: cleanEmail, code: otpCode, expiresAt },
    });

    try {
      await sendResetPasswordEmail(cleanEmail, otpCode, lang);
    } catch (mailErr: any) {
      await prisma.otp.deleteMany({ where: { email: cleanEmail } });
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
          ? `A reset code was sent to ${cleanEmail}.`
          : `Đã gửi mã đặt lại mật khẩu tới ${cleanEmail}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi gửi mã.' }, { status: 500 });
  }
}
