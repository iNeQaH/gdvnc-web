import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, signToken, setAuthCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/requestIp';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: Request) {
  try {
    if (!isBrowserSameOriginFetch(req)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
    }

    const session = await getSessionUser();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = getClientIp(req);
    const limited = rateLimit(`2fa-setup:${session.userId}:${ip}`, 10, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, username: true, totpEnabled: true },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.totpEnabled) return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      user.email || user.username,
      'GDVN-Web',
      secret
    );

    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Save secret temporarily in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret },
    });

    return NextResponse.json({ secret, qrDataUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!isBrowserSameOriginFetch(req)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
    }

    const session = await getSessionUser();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = getClientIp(req);
    const limited = rateLimit(`2fa-verify:${session.userId}:${ip}`, 10, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const cleanToken = String(token).trim();
    if (!/^[0-9]{6}$/.test(cleanToken)) {
      return NextResponse.json({ error: 'Mã 2FA phải bao gồm 6 chữ số.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, role: true, totpSecret: true, totpEnabled: true },
    });

    if (!user?.totpSecret) return NextResponse.json({ error: '2FA not setup' }, { status: 400 });
    if (user.totpEnabled) return NextResponse.json({ error: 'Already enabled' }, { status: 400 });

    const isValid = authenticator.check(cleanToken, user.totpSecret);
    if (!isValid) return NextResponse.json({ error: 'Invalid 2FA token' }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true, tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });

    const newJwt = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: updated.tokenVersion,
    });
    await setAuthCookie(newJwt);
    await logAudit(user.id, 'ENABLE_2FA', { username: user.username }, ip);

    return NextResponse.json({ success: true, message: '2FA Enabled' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isBrowserSameOriginFetch(req)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
    }

    const session = await getSessionUser();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = getClientIp(req);
    const limited = rateLimit(`2fa-disable:${session.userId}:${ip}`, 5, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, role: true, totpEnabled: true, totpSecret: true },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Optional TOTP verification if provided in request body
    try {
      const body = await req.json();
      if (body?.token && user.totpSecret) {
        const isValid = authenticator.check(String(body.token).trim(), user.totpSecret);
        if (!isValid) {
          return NextResponse.json({ error: 'Invalid 2FA token' }, { status: 400 });
        }
      }
    } catch {
      // No JSON body provided
    }

    // Xoá Secret, set totpEnabled = false, và tăng tokenVersion để thu hồi các phiên khác
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: false, totpSecret: null, tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });

    const newJwt = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: updated.tokenVersion,
    });
    await setAuthCookie(newJwt);
    await logAudit(user.id, 'DISABLE_2FA', { username: user.username }, ip);

    return NextResponse.json({ success: true, message: '2FA Disabled' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
