import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { migrateMediaToUt } from '@/lib/migrateMediaToUt';
import fs from 'fs';
import path from 'path';
import { getUserDataDir, deleteLocalFiles } from '@/lib/localStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const uploadsDir = path.join(getUserDataDir(), 'uploads');
    let dirExists = true;
    try {
      await fs.promises.access(uploadsDir);
    } catch {
      dirExists = false;
    }

    const files = [];
    let totalSize = 0;

    if (dirExists) {
      const entries = await fs.promises.readdir(uploadsDir);
      // Fetch stats for all files concurrently, bounded manually if needed, but since we are limiting to 100, we'll sort.
      // Wait, to sort by newest we need stats for all.
      // If there are many files, this could be slow, but it's acceptable for now.
      const stats = await Promise.all(
        entries.map(async (name) => {
          const filePath = path.join(uploadsDir, name);
          const stat = await fs.promises.stat(filePath).catch(() => null);
          return { name, stat };
        })
      );

      for (const { name, stat } of stats) {
        if (stat && stat.isFile()) {
          files.push({
            key: name,
            name: name,
            size: stat.size,
            status: 'Uploaded',
            uploadedAt: stat.mtimeMs,
            url: `/api/uploads/${name}`,
          });
          totalSize += stat.size;
        }
      }

      // Sort by newest first and limit to 100
      files.sort((a, b) => b.uploadedAt - a.uploadedAt);
    }

    return NextResponse.json({
      success: true,
      hasMore: files.length > 100,
      usage: { totalBytes: totalSize, totalFiles: files.length },
      files: files.slice(0, 100),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list files.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const keys = Array.isArray(body?.keys)
      ? body.keys.filter((key: unknown) => typeof key === 'string' && key.trim())
      : typeof body?.key === 'string'
        ? [body.key]
        : [];
    if (keys.length === 0) {
      return NextResponse.json({ error: 'Missing file key.' }, { status: 400 });
    }
    
    await deleteLocalFiles(keys);
    return NextResponse.json({ success: true, deleted: keys.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete files.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const batch = Math.min(30, Math.max(1, Number(body?.batch) || 20));
    const result = await migrateMediaToUt(batch);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to migrate images.' },
      { status: 500 }
    );
  }
}
