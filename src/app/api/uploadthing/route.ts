import { createRouteHandler } from 'uploadthing/next';
import type { NextRequest } from 'next/server';
import { gdvnFileRouter } from './core';
import { getUploadthingToken } from '@/lib/uploadthing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function handlers() {
  const token = getUploadthingToken();
  return createRouteHandler({
    router: gdvnFileRouter,
    config: token ? { token } : undefined,
  });
}

export const GET = (req: NextRequest) => handlers().GET(req);
export const POST = (req: NextRequest) => handlers().POST(req);
