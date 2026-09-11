import { appEventEmitter } from '@/lib/eventEmitter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream closed or client disconnected
        }
      };

      const onNotify = (payload: any) => {
        sendEvent('notification', payload || {});
      };

      const onLevelUpdate = (payload: any) => {
        sendEvent('level-update', payload || {});
      };

      appEventEmitter.on('notification', onNotify);
      appEventEmitter.on('level-update', onLevelUpdate);

      // Send initial heartbeat
      sendEvent('ping', { connected: true, at: Date.now() });

      const interval = setInterval(() => {
        sendEvent('ping', { at: Date.now() });
      }, 25000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        appEventEmitter.off('notification', onNotify);
        appEventEmitter.off('level-update', onLevelUpdate);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
