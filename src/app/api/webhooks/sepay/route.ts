import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

const AMOUNT_PER_MONTH = 20000;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-sepay-signature');
    
    const secret = process.env.SEPAY_WEBHOOK_SECRET;
    if (secret) {
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest('hex');
      
      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    const transferAmount = parseInt(body.transferAmount) || 0;
    const transactionContent = String(body.content || body.transactionContent || '').toUpperCase();
    const transferType = String(body.transferType || '').toLowerCase();

    if (transferType && transferType !== 'in') {
      return NextResponse.json({ success: true, note: 'Ignore outbound transfer' });
    }

    const match = transactionContent.match(/GDVN\s+([A-Z0-9_.-]+)/);
    if (!match) {
      return NextResponse.json({ success: true, note: 'Transaction content does not match' });
    }

    const username = match[1];

    const months = Math.floor(transferAmount / AMOUNT_PER_MONTH);
    if (months <= 0) {
      return NextResponse.json({ success: true, note: 'Amount too small' });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ success: true, note: 'User not found' });
    }

    const now = new Date();
    const currentSupporter = targetUser.supporterUntil;
    const baseDate = currentSupporter && currentSupporter > now ? currentSupporter : now;
    
    const nextDate = new Date(baseDate.getTime());
    nextDate.setMonth(nextDate.getMonth() + months);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { supporterUntil: nextDate }
    });

    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: '🎉 Quyên góp thành công',
        message: `Hệ thống đã nhận được ${transferAmount.toLocaleString('vi-VN')}đ. Cảm ơn bạn đã ủng hộ dự án! Bạn được tự động cấp ${months} tháng danh hiệu Supporter.`,
      }
    });

    return NextResponse.json({ success: true, user: targetUser.username, monthsAdded: months });

  } catch (error) {
    console.error('SePay Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
