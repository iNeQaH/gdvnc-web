import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    const { action, userId, amount, recipientUsername } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Chưa xác thực người dùng.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    const isSuperAdmin = user.role === 'ADMIN' || user.username === 'iNeQaH';
    // 1. EARN POINTS VIA AD
    if (action === 'EARN_AD') {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          spPoints: { increment: 100 },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Bạn đã nhận thành công +100 Điểm SP!',
        spPoints: updatedUser.spPoints,
      });
    }

    // 2. REDEEM 1 MONTH SUPPORTER (1000 SP)
    if (action === 'REDEEM_MONTH') {
      
      if (!isSuperAdmin && user.spPoints < 1000) {
        return NextResponse.json({ success: false, error: 'Bạn không đủ 1,000 Điểm SP để đổi gói.' }, { status: 400 });
      }

      // Calculate new supporter expiration (extend if already active)
      const now = new Date();
      const currentExpiry = user.supporterUntil && user.supporterUntil > now ? new Date(user.supporterUntil) : now;
      const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(isSuperAdmin ? {} : { spPoints: { decrement: 1000 } }),
          supporterUntil: newExpiry,
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Đổi Gói Supporter Thành Công',
          message: `Bạn đã sử dụng 1,000 Điểm SP để kích hoạt 1 tháng Supporter. Hạn sử dụng đến: ${newExpiry.toLocaleDateString('vi-VN')}.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Kích hoạt 1 tháng Supporter thành công!',
        spPoints: updatedUser.spPoints,
        supporterUntil: updatedUser.supporterUntil,
      });
    }

    // 3. TRANSFER SP POINTS TO ANOTHER USER
    if (action === 'TRANSFER') {
      const transferAmount = parseInt(amount);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Số điểm tặng không hợp lệ.' }, { status: 400 });
      }

      if (!isSuperAdmin && user.spPoints < transferAmount) {
        return NextResponse.json({ success: false, error: 'Số dư SP của bạn không đủ.' }, { status: 400 });
      }

      if (!recipientUsername || recipientUsername.trim().toLowerCase() === user.username.toLowerCase()) {
        return NextResponse.json({ success: false, error: 'Người nhận không hợp lệ (không thể tự tặng cho chính mình).' }, { status: 400 });
      }

      const recipient = await prisma.user.findUnique({
        where: { username: recipientUsername.trim() },
      });

      if (!recipient) {
        return NextResponse.json({ success: false, error: `Không tìm thấy người chơi "${recipientUsername}".` }, { status: 404 });
      }

      // Deduct from sender
      const updatedSender = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(isSuperAdmin ? {} : { spPoints: { decrement: transferAmount } }),
        },
      });

      // Credit recipient
      await prisma.user.update({
        where: { id: recipient.id },
        data: {
          spPoints: { increment: transferAmount },
        },
      });

      // Create notification for recipient
      await prisma.notification.create({
        data: {
          userId: recipient.id,
          title: 'Nhận Điểm SP Tặng',
          message: `Người chơi "${user.username}" vừa tặng bạn ${transferAmount.toLocaleString()} Điểm SP!`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Đã chuyển tặng ${transferAmount.toLocaleString()} SP cho "${recipient.username}" thành công!`,
        spPoints: updatedSender.spPoints,
      });
    }

    // 4. GET BALANCE & NOTIFICATIONS
    if (action === 'GET_BALANCE') {
      const notifs = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return NextResponse.json({
        success: true,
        spPoints: user.spPoints,
        supporterUntil: user.supporterUntil,
        notifications: notifs,
      });
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ.' }, { status: 400 });
  } catch (error: any) {
    console.error('Points API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi xử lý điểm SP.' }, { status: 500 });
  }
}
