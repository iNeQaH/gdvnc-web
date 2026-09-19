import { NextResponse } from 'next/server';
import {
  issueCaptchaToken,
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
    const turnstileRequired = Boolean(process.env.TURNSTILE_SECRET_KEY);
    return NextResponse.json({
      success: true,
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
    const limited = rateLimit(`captcha:${ip}`, 20, 60 * 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const body = await req.json().catch(() => ({}));
    const turnstileToken = body.turnstileToken || body.token;

    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken || !(await verifyTurnstile(turnstileToken, ip))) {
        return NextResponse.json({ success: false, error: 'Xác thực Cloudflare thất bại.' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, token: issueCaptchaToken(ip) });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
