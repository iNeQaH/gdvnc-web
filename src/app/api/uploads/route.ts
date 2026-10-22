import { isBrowserSameOriginFetch } from '@/lib/origin';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { uploadBufferToLocal } from '@/lib/localFileStorage';
import { validateImageUpload } from '@/lib/imageUploadValidate';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { publicApiError } from '@/lib/apiError';

export async function POST(req: Request) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isStaff = auth.role === 'ADMIN' || auth.role === 'MODERATOR';
  const uploadLimit = isStaff ? 80 : 40;
  const limited = rateLimit(`uploads:${auth.userId}`, uploadLimit, 2 * 60_000);
  if (!limited.ok) {
    return rateLimitResponse(
      limited.retryAfterSec,
      'Bạn đã tải ảnh lên quá số lần cho phép'
    );
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Dung lượng tải lên vượt quá giới hạn cho phép (tối đa 25MB).' }, { status: 413 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('file');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json({ error: 'Chỉ được tải lên tối đa 5 tệp mỗi lần.' }, { status: 400 });
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
      url: uploadedUrls[0] || null,
      urls: uploadedUrls,
      files: uploadedData,
    });
  } catch (err: unknown) {
    return publicApiError(err, 'Không thể tải file lên.', 500);
  }
}
