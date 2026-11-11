import { appEventEmitter } from '@/lib/eventEmitter';
import { getSessionUser } from '@/lib/auth';
import { getClientIp } from '@/lib/requestIp';
import { acquireSseConnection, releaseSseConnection } from '@/lib/sseLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!acquireSseConnection(ip, 5)) {
    return new Response(JSON.stringify({ error: 'Too many live connections.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authUser = await getSessionUser().catch(() => null);

  let interval: NodeJS.Timeout | null = null;
  let onNotify: ((payload: unknown) => void) | null = null;
  let onLevelUpdate: (() => void) | null = null;
  let released = false;

  const releaseSlot = () => {
    if (released) return;
    released = true;
    releaseSseConnection(ip);
  };

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const cleanup = () => {
        request.signal.removeEventListener('abort', cleanup);
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        if (onNotify) {
          appEventEmitter.off('notification', onNotify);
          onNotify = null;
        }
        if (onLevelUpdate) {
          appEventEmitter.off('level-update', onLevelUpdate);
          onLevelUpdate = null;
        }
        releaseSlot();
        try {
          controller.close();
        } catch {
          /* closed */
        }
      };

      const sendEvent = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      onNotify = (payload: unknown) => {
        const p = payload as { userId?: string } | null;
        if (p?.userId && (!authUser || authUser.userId !== p.userId)) {
          return;
        }
        sendEvent('notification', { at: Date.now() });
      };

      onLevelUpdate = () => {
        sendEvent('level-update', { at: Date.now() });
      };

      appEventEmitter.on('notification', onNotify);
      appEventEmitter.on('level-update', onLevelUpdate);

      sendEvent('ping', { connected: true, at: Date.now() });

      interval = setInterval(() => {
        sendEvent('ping', { at: Date.now() });
      }, 25000);

      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (onNotify) {
        appEventEmitter.off('notification', onNotify);
        onNotify = null;
      }
      if (onLevelUpdate) {
        appEventEmitter.off('level-update', onLevelUpdate);
        onLevelUpdate = null;
      }
      releaseSlot();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
