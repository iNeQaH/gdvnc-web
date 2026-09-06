import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cronAuth';
import { syncGdvnSheet } from '@/lib/syncGdvnSheet';
import { publicApiError } from '@/lib/apiError';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncGdvnSheet();
    bustPublicCache(CACHE_TAGS.levels, CACHE_TAGS.highlights, CACHE_TAGS.timeline);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return publicApiError(error, 'Sheet sync failed.');
  }
}
