import { NextRequest } from 'next/server';
import { renderSiteOgImage } from '@/lib/siteOg';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title') || 'GDVNC';
  const desc = req.nextUrl.searchParams.get('desc') || '';
  return renderSiteOgImage(title, desc);
}
