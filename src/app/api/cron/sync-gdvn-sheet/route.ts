import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cronAuth';
import { syncGdvnSheet } from '@/lib/syncGdvnSheet';
import { publicApiError } from '@/lib/apiError';

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncGdvnSheet();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return publicApiError(error, 'Sheet sync failed.');
  }
}
