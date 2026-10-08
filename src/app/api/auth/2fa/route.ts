import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    const session = await getSessionUser();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, totpSecret: true, totpEnabled: true },
    });

    if (!user?.totpSecret) return NextResponse.json({ error: '2FA not setup' }, { status: 400 });
    if (user.totpEnabled) return NextResponse.json({ error: 'Already enabled' }, { status: 400 });

    const isValid = authenticator.check(token, user.totpSecret);
    if (!isValid) return NextResponse.json({ error: 'Invalid 2FA token' }, { status: 400 });

    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    });

    // We can call audit log here if we want
    try {
        const auditResponse = await fetch(`http://127.0.0.1:8088/api/admin/audit-logs`, {
           method: 'POST',
           body: JSON.stringify({ action: 'ENABLE_2FA', userId: user.id })
        });
    } catch (e) {}

    return NextResponse.json({ success: true, message: '2FA Enabled' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
