import { isBrowserSameOriginFetch } from '@/lib/origin';
import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { publicApiError } from '@/lib/apiError';

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await props.params;
    const existing = await prisma.redeemCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Mã code không tồn tại.' }, { status: 404 });
    }

    await prisma.redeemCode.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa mã code thành công.' });
  } catch (error) {
    return publicApiError(error, 'Không thể xóa Redeem Code.', 500);
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await props.params;
    const body = await req.json();

    const existing = await prisma.redeemCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Mã code không tồn tại.' }, { status: 404 });
    }

    const updated = await prisma.redeemCode.update({
      where: { id },
      data: {
        isActive: body?.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });

    return NextResponse.json({ success: true, code: updated });
  } catch (error) {
    return publicApiError(error, 'Không thể cập nhật trạng thái Redeem Code.', 500);
  }
}
