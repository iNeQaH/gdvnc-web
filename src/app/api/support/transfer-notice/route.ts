import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { clipText } from '@/lib/validate';
import { supportTransferContent } from '@/lib/supportPayment';

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`support-paid:${auth.userId}:${getClientIp(req)}`, 3, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = await req.json().catch(() => ({}));
    const content = supportTransferContent(auth.username);
    const note = clipText(body.content, 80) || content;
    const message = `${auth.username} · ${note}`;

    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'Ủng hộ chờ duyệt',
          message,
        })),
      });
    }

    await prisma.helpRequest.create({
      data: {
        userId: auth.userId,
        title: 'Ủng hộ',
        content: message,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không gửi được thông báo chuyển khoản.' },
      { status: 500 }
    );
  }
}
