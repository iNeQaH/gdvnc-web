'use client';

export async function uploadImagesToUt(
  files: File[],
  endpoint: 'imageUploader' | 'adminImage' = 'imageUploader'
): Promise<string[]> {
  if (files.length === 0) return [];
  
  const formData = new FormData();
  for (const file of files) {
    formData.append('file', file);
  }

  const res = await fetch('/api/uploads', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Upload failed');
  }

  const data = await res.json();
  if (!data.success || !data.urls) {
    throw new Error('Upload failed');
  }

  return data.urls;
}
