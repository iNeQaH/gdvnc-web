import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cronAuth';
import { syncGdvnSheet } from '@/lib/syncGdvnSheet';
import { publicApiError } from '@/lib/apiError';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export const maxDuration = 60;

export async function GET(req: Request) {
  // Disabled auto-update per request. Only update via manual admin function.
  return NextResponse.json({ success: true, message: 'Auto-sync disabled' });
}
