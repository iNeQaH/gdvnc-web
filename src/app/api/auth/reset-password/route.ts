import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { publicApiError } from '@/lib/apiError';
import { normalizeEmail } from '@/lib/emailProviders';
import { isBrowserSameOriginFetch } from '@/lib/origin';

const OTP_MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    if (!isBrowserSameOriginFetch(req)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
    }

    const limitedIp = rateLimit(`reset:${getClientIp(req)}`, 8, 60_000);
    if (!limitedIp.ok) return rateLimitResponse(limitedIp.retryAfterSec);

    const { email, otp, password, locale } = await req.json();
    const en = locale === 'en';
    const cleanEmail = normalizeEmail(email);

    if (cleanEmail) {
      const limitedEmail = rateLimit(`reset-email:${cleanEmail}`, 8, 60_000);
      if (!limitedEmail.ok) return rateLimitResponse(limitedEmail.retryAfterSec);
    }

    if (!cleanEmail || !otp || !password) {
      return NextResponse.json(
        { error: en ? 'Please fill in all fields.' : 'Vui lòng điền đầy đủ thông tin.' },
        { status: 400 }
      );
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { error: en ? 'Password must be at least 6 characters.' : 'Mật khẩu phải có ít nhất 6 ký tự.' },
        { status: 400 }
      );
    }

    const cleanOtp = String(otp).trim();
    const lockedMsg = en
      ? 'Too many incorrect codes. Request a new OTP.'
      : 'Nhập sai quá nhiều lần. Hãy yêu cầu mã OTP mới.';
    const invalidMsg = en ? 'OTP is incorrect or has expired.' : 'Mã OTP không đúng hoặc đã hết hạn.';

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        return { error: invalidMsg, status: 400 };
      }

      const row = await tx.otp.findFirst({
        where: { email: cleanEmail, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      if (!row) {
        return { error: invalidMsg, status: 400 };
      }

      if (row.failedAttempts >= OTP_MAX_ATTEMPTS) {
        await tx.otp.deleteMany({ where: { email: cleanEmail } });
        return { error: lockedMsg, status: 429 };
      }

      if (row.code !== cleanOtp) {
        const next = row.failedAttempts + 1;
        if (next >= OTP_MAX_ATTEMPTS) {
          await tx.otp.deleteMany({ where: { email: cleanEmail } });
          return { error: lockedMsg, status: 429 };
        }
        await tx.otp.update({ where: { id: row.id }, data: { failedAttempts: next } });
        return { error: invalidMsg, status: 400 };
      }

      await tx.otp.deleteMany({ where: { email: cleanEmail } });

      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });

      return { success: true };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: en ? 'Password updated successfully. You can log in now.' : 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.',
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi đặt lại mật khẩu.');
  }
}
