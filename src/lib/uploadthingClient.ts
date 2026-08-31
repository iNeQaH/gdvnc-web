'use client';

import { genUploader } from 'uploadthing/client';
import type { GdvnFileRouter } from '@/app/api/uploadthing/core';

const { uploadFiles } = genUploader<GdvnFileRouter>({
  url: '/api/uploadthing',
});

export async function uploadImagesToUt(
  files: File[],
  endpoint: 'imageUploader' | 'adminImage' = 'imageUploader'
) {
  if (files.length === 0) return [];
  const uploaded = await uploadFiles(endpoint, { files });
  const urls = uploaded.map((file) => file.ufsUrl).filter(Boolean);
  if (urls.length === 0) throw new Error('Upload failed');
  return urls;
}
