import { NextResponse } from 'next/server';
import { issueCaptchaToken } from '@/lib/captcha';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`captcha:${getClientIp(req)}`, 30, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const body = await req.json();
    const trajectory = body.trajectory;

    if (!trajectory || !Array.isArray(trajectory) || trajectory.length < 8) {
      return NextResponse.json({ success: false, error: 'Invalid interaction data.' }, { status: 400 });
    }

    const first = trajectory[0];
    const last = trajectory[trajectory.length - 1];
    if (
      typeof first?.t !== 'number' ||
      typeof last?.t !== 'number' ||
      typeof first?.x !== 'number' ||
      typeof last?.x !== 'number'
    ) {
      return NextResponse.json({ success: false, error: 'Invalid interaction data.' }, { status: 400 });
    }

    const timeDiff = last.t - first.t;
    if (timeDiff < 250 || timeDiff > 30000) {
      return NextResponse.json({ success: false, error: 'Interaction too fast or too slow.' }, { status: 400 });
    }

    const xDiff = Math.abs(last.x - first.x);
    if (xDiff < 80) {
      return NextResponse.json({ success: false, error: 'Insufficient movement.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, token: issueCaptchaToken() });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
