import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isMailConfigured, sendResetPasswordEmail } from '@/lib/mail';

export async function POST(req: Request) {
  try {
    const { email, locale, captchaToken } = await req.json();
    const lang = locale === 'en' ? 'en' : 'vi';

    if (!captchaToken) {
      return NextResponse.json(
        { error: lang === 'en' ? 'Anti-bot verification required.' : 'Vui lòng xác thực chống bot trước.' },
        { status: 400 }
      );
    }

    const crypto = require('crypto');
    const secret = process.env.CAPTCHA_SECRET || 'fallback_secret_gdvnc_2026';
    const parts = captchaToken.split('.');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Invalid captcha token' }, { status: 400 });
    }
    const [payload, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (signature !== expectedSig) {
      return NextResponse.json({ error: 'Captcha token mismatch' }, { status: 400 });
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
      return NextResponse.json(
        {
          error:
            lang === 'en'
              ? 'No account found with this email address.'
              : 'Không tìm thấy tài khoản nào với email này.',
        },
        { status: 404 }
      );
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

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
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
