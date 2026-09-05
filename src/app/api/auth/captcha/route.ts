import { NextResponse } from 'next/server';
import {
  issueCaptchaToken,
  issuePowChallenge,
  verifyPowSolution,
  verifyTurnstile,
} from '@/lib/captcha';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: Request) {
  try {
    if (!isBrowserSameOriginFetch(req)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
    }
    const ip = getClientIp(req);
    const limited = rateLimit(`captcha-chal:${ip}`, 20, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);
    const turnstileRequired =
      Boolean(process.env.TURNSTILE_SECRET_KEY) || process.env.NODE_ENV === 'production';
    return NextResponse.json({
      success: true,
      ...issuePowChallenge(ip),
      turnstileRequired,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!isBrowserSameOriginFetch(req)) {
      return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 403 });
    }

    const ip = getClientIp(req);
    const limited = rateLimit(`captcha:${ip}`, 12, 60 * 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const body = await req.json();
    if (!verifyPowSolution(ip, body.seed, body.nonce)) {
      return NextResponse.json({ success: false, error: 'Challenge failed.' }, { status: 400 });
    }
    if (!(await verifyTurnstile(body.turnstileToken, ip))) {
      return NextResponse.json({ success: false, error: 'Captcha failed.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, token: issueCaptchaToken(ip) });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
