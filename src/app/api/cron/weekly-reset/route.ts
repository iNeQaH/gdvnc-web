import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cronAuth';
import { publicApiError } from '@/lib/apiError';
import { checkAndTriggerWeeklyReset } from '@/lib/weeklyReset';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAndTriggerWeeklyReset();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return publicApiError(error, 'Weekly reset failed.');
  }
}
