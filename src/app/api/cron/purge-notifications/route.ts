import { NextResponse } from 'next/server';
import { purgeExpiredNotifications } from '@/lib/purgeExpiredNotifications';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const vercelCron = req.headers.get('x-vercel-cron');
  const ok =
    (secret && auth === `Bearer ${secret}`) ||
    Boolean(vercelCron);

  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cleared = await purgeExpiredNotifications();
    return NextResponse.json({ success: true, cleared });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Purge failed.' }, { status: 500 });
  }
}
