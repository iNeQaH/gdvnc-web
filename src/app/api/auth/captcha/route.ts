import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const trajectory = body.trajectory;

    if (!trajectory || !Array.isArray(trajectory) || trajectory.length < 3) {
      return NextResponse.json({ success: false, error: 'Invalid interaction data.' }, { status: 400 });
    }

    const first = trajectory[0];
    const last = trajectory[trajectory.length - 1];

    // Basic heuristic: must take at least 100ms to drag
    const timeDiff = last.t - first.t;
    if (timeDiff < 100 || timeDiff > 30000) {
      return NextResponse.json({ success: false, error: 'Interaction too fast or too slow.' }, { status: 400 });
    }

    // Must have moved horizontally
    const xDiff = Math.abs(last.x - first.x);
    if (xDiff < 50) {
      return NextResponse.json({ success: false, error: 'Insufficient movement.' }, { status: 400 });
    }

    // Generate a secure token (HMAC with expiration)
    const secret = process.env.CAPTCHA_SECRET || 'fallback_secret_gdvnc_2026';
    const timestamp = Date.now();
    const payload = `verified_human_${timestamp}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const token = `${payload}.${signature}`;

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
