import { appEventEmitter } from '@/lib/eventEmitter';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authUser = await getAuthUser().catch(() => null);

  let interval: NodeJS.Timeout | null = null;
  let onNotify: ((payload: any) => void) | null = null;
  let onLevelUpdate: ((payload: any) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const cleanup = () => {
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
        try {
          controller.close();
        } catch {}
      };

      const sendEvent = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      onNotify = (payload: any) => {
        // If notification is targeted to a specific user, only deliver to that user
        if (payload?.userId && (!authUser || authUser.userId !== payload.userId)) {
          return;
        }
        // Don't leak internal IDs to client
        sendEvent('notification', { at: Date.now() });
      };

      onLevelUpdate = () => {
        sendEvent('level-update', { at: Date.now() });
      };

      appEventEmitter.on('notification', onNotify);
      appEventEmitter.on('level-update', onLevelUpdate);

      // Send initial heartbeat
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

