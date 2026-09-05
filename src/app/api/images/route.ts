import { NextResponse } from 'next/server';
import { estimateDataUrlBytes } from '@/lib/profileEmbed';
import { requireAuth } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { uploadDataUrlToUt } from '@/lib/uploadthing';

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const MAX_COVER_BYTES = 8 * 1024 * 1024;
const ALLOWED = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`images:${auth.userId}`, 20, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const { dataUrl, kind } = await req.json();

    if (!dataUrl || typeof dataUrl !== 'string' || !ALLOWED.test(dataUrl)) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const bytes = estimateDataUrlBytes(dataUrl);
    const maxBytes = kind === 'cover' ? MAX_COVER_BYTES : MAX_AVATAR_BYTES;

    if (bytes > maxBytes) {
      const mb = kind === 'cover' ? 8 : 4;
      return NextResponse.json(
        { error: `Ảnh vượt quá giới hạn ${mb}MB.` },
        { status: 400 }
      );
    }

    const url = await uploadDataUrlToUt(dataUrl, kind === 'cover' ? 'cover.jpg' : 'avatar.jpg');
    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
