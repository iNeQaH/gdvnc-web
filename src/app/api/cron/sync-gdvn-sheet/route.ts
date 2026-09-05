import { NextResponse } from 'next/server';
import { syncGdvnSheet } from '@/lib/syncGdvnSheet';

export const maxDuration = 60;

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
    const result = await syncGdvnSheet();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sheet sync failed.' }, { status: 500 });
  }
}
