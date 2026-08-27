import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { claimLegacyRecords } from '@/lib/claimLegacyRecords';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
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

    await prisma.user.update({
      where: { id },
      data: { gdVerified: true },
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
    return NextResponse.json({ error: error.message || 'Lỗi xác minh người dùng.' }, { status: 500 });
  }
}
