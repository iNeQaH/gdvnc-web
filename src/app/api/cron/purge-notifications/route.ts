import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cronAuth';
import { purgeExpiredNotifications } from '@/lib/purgeExpiredNotifications';
import { publicApiError } from '@/lib/apiError';

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cleared = await purgeExpiredNotifications();
    return NextResponse.json({ success: true, cleared });
  } catch (error) {
    return publicApiError(error, 'Purge failed.');
  }
}
