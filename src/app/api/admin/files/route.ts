import { NextResponse } from 'next/server';
import { requireFullAdmin } from '@/lib/auth';
import { migrateMediaToUt } from '@/lib/migrateMediaToUt';
import { publicUrlForKey, utapi } from '@/lib/uploadthing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [listed, usage] = await Promise.all([
      utapi().listFiles({ limit: 100 }),
      utapi().getUsageInfo().catch(() => null),
    ]);
    return NextResponse.json({
      success: true,
      hasMore: listed.hasMore,
      usage,
      files: listed.files.map((file) => ({
        key: file.key,
        name: file.name,
        size: file.size,
        status: file.status,
        uploadedAt: file.uploadedAt,
        url: publicUrlForKey(file.key),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list files.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireFullAdmin();
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
    await utapi().deleteFiles(keys);
    return NextResponse.json({ success: true, deleted: keys.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete files.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireFullAdmin();
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
