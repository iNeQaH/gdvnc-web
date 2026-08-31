import { createRouteHandler } from 'uploadthing/next';
import { gdvnFileRouter } from './core';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const { GET, POST } = createRouteHandler({
  router: gdvnFileRouter,
});
