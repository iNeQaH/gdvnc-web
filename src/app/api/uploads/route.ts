import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { uploadBufferToLocal } from '@/lib/localStorage';

export async function POST(req: Request) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('file');
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];
    const uploadedData = [];

    for (const fileValue of files) {
      if (typeof fileValue === 'string') continue; // Skip non-file parts
      const file = fileValue as File;
      
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length > 16 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} is too large (max 16MB)` }, { status: 400 });
      }

      const { url, key } = await uploadBufferToLocal(buffer, file.type, file.name);
      uploadedUrls.push(url);
      uploadedData.push({ url, key, name: file.name, size: file.size });
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls, // return flat array of URLs for ease of use
      files: uploadedData,
    });
  } catch (err: any) {
    console.error('Local file upload error:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}
