import { isBrowserSameOriginFetch } from '@/lib/origin';
import { publicApiError } from '@/lib/apiError';
import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { claimLegacyRecords } from '@/lib/claimLegacyRecords';
import { syncUserGdBrowserStats } from '@/lib/gdBrowserSync';
import { getVnWeekString } from '@/lib/activityPoints';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let auth: any;
  try {
    auth = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    const gdName = target.gdUsername?.trim();
    if (gdName) {
      const conflict = await prisma.user.findFirst({
        where: {
          id: { not: id },
          gdVerified: true,
          gdUsername: { equals: gdName, mode: 'insensitive' },
        },
        select: { username: true },
      });
      if (conflict) {
        return NextResponse.json({
          error: `Tên GD "${gdName}" đã được xác minh cho tài khoản ${conflict.username}.`,
        }, { status: 409 });
      }
    }

    // 1. Đồng bộ ngay chỉ số GD nếu có gdName
    let syncedStars = target.gdStars || 0;
    let syncedMoons = target.gdMoons || 0;
    let syncedDemons = target.gdDemons || 0;

    if (gdName) {
      try {
        const synced = await syncUserGdBrowserStats(target, { id: auth.userId }, true);
        if (synced) {
          syncedStars = synced.stars;
          syncedMoons = synced.moons;
          syncedDemons = synced.demons;
        }
      } catch (err) {
        console.warn('Sync GD stats on verify warning:', err);
      }
    }

    // 2. Cập nhật gdVerified đồng thời thiết lập baseline Điểm Hoạt Động sạch
    // Tuyệt đối không để chênh lệch quá khứ tính thành điểm hoạt động hôm nay
    await prisma.user.update({
      where: { id },
      data: {
        gdVerified: true,
        activityPoints: 0,
        activityDate: getVnWeekString(),
        activityPrevStars: syncedStars,
        activityPrevMoons: syncedMoons,
        activityPrevDemons: syncedDemons,
      },
    });

    const { claimed } = await claimLegacyRecords(id, gdName || null);

    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Tài khoản Geometry Dash đã được xác minh',
        message: gdName
          ? `Admin đã xác minh tên GD "${gdName}". ${claimed} kỷ lục cũ đã được gắn vào tài khoản của bạn.`
          : 'Admin đã xác minh tài khoản của bạn.',
      },
    });

    return NextResponse.json({
      success: true,
      gdVerified: true,
      gdUsername: target.gdUsername,
      claimed,
    });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi xác minh người dùng.', 500);
  }
}
