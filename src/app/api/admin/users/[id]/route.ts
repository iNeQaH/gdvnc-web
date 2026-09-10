import { requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { deleteUserAccount } from '@/lib/deleteUser';
import { publicApiError } from '@/lib/apiError';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  let actorJwt;
  try {
    actorJwt = await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    let reason = '';
    try {
      const body = await req.json();
      reason = body?.reason || '';
    } catch {
      /* ignore */
    }
    const result = await deleteUserAccount(actorJwt.userId, id, reason);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: 'Đã xóa người dùng thành công.' });
  } catch (error) {
    return publicApiError(error, 'Lỗi server');
  }
}
