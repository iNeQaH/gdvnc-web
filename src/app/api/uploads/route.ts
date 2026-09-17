import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { uploadBufferToLocal } from '@/lib/localStorage';
import { validateImageUpload } from '@/lib/imageUploadValidate';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`uploads:${auth.userId}`, 10, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const formData = await req.formData();
    const files = formData.getAll('file');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];
    const uploadedData = [];

    for (const fileValue of files) {
      if (typeof fileValue === 'string') continue;
      const file = fileValue as File;

      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length > 16 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} is too large (max 16MB)` }, { status: 400 });
      }

      const validated = validateImageUpload(buffer, file.name);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }

      const mime = `image/${validated.ext === 'jpg' ? 'jpeg' : validated.ext}`;
      const { url, key } = await uploadBufferToLocal(buffer, mime, file.name, auth.userId);
      uploadedUrls.push(url);
      uploadedData.push({ url, key, name: file.name, size: file.size });
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      files: uploadedData,
    });
  } catch (err: unknown) {
    console.error('Local file upload error:', err);
    const message = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
