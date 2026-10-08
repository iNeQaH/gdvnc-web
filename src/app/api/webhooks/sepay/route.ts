import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

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

    let targetUsername = '';
    let monthsToGrant = 0;

    // Match new format: [USERNAME] SUPPORT [M]T
    const matchNew = transactionContent.match(/([A-Z0-9_.-]+)\s+SUPPORT\s+(\d+)T/);
    if (matchNew) {
      targetUsername = matchNew[1];
      monthsToGrant = parseInt(matchNew[2]);
      
      // Calculate expected price to verify
      let discountPercent = Math.floor(monthsToGrant / 3) * 5;
      if (discountPercent > 100) discountPercent = 100;
      const expectedPrice = (20000 * monthsToGrant) * (1 - discountPercent / 100);
      
      if (transferAmount < expectedPrice - 1000) { // allow 1000 VND variance
        // They didn't pay enough for the requested months, fallback to basic math without discount
        monthsToGrant = Math.floor(transferAmount / 20000);
      }
    } else {
      // Fallback old format: GDVN [USERNAME]
      const matchOld = transactionContent.match(/GDVN\s+([A-Z0-9_.-]+)/);
      if (matchOld) {
        targetUsername = matchOld[1];
        monthsToGrant = Math.floor(transferAmount / 20000);
      } else {
        return NextResponse.json({ success: true, note: 'Transaction content does not match any known format' });
      }
    }

    if (monthsToGrant <= 0) {
      return NextResponse.json({ success: true, note: 'Amount too small or 0 months calculated' });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        username: { equals: targetUsername, mode: 'insensitive' }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ success: true, note: 'User not found' });
    }

    const now = new Date();
    const currentSupporter = targetUser.supporterUntil;
    const baseDate = currentSupporter && currentSupporter > now ? currentSupporter : now;
    
    const nextDate = new Date(baseDate.getTime());
    nextDate.setMonth(nextDate.getMonth() + monthsToGrant);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { supporterUntil: nextDate }
    });

    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: '🎉 Quyên góp thành công',
        message: `Hệ thống đã nhận được ${transferAmount.toLocaleString('vi-VN')}đ. Tài khoản của bạn được cấp ${monthsToGrant} tháng danh hiệu Supporter. Cảm ơn vì sự ủng hộ!`,
      }
    });

    return NextResponse.json({ success: true, user: targetUser.username, monthsAdded: monthsToGrant });

  } catch (error) {
    console.error('SePay Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
