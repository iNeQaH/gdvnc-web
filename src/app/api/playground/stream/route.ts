import { getSessionUser } from '@/lib/auth';
import { isSuperAdminUser } from '@/lib/roles';
import { appEventEmitter } from '@/lib/eventEmitter';
import { playgroundManager } from '@/lib/playground';
import { getClientIp } from '@/lib/requestIp';
import { acquireSseConnection, releaseSseConnection } from '@/lib/sseLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limitKey = `pg:${ip}`;
  // Dedicated SSE bucket for /nhowstrayson so multiple site tabs / F5 reloads never collide with /api/stream
  if (!acquireSseConnection(limitKey, 12)) {
    return new Response(JSON.stringify({ error: 'Too many live connections.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('room') || 'public-1';

  const authUser = await getSessionUser().catch(() => null);
  if (!authUser || !isSuperAdminUser(authUser)) {
    return new Response(JSON.stringify({ error: 'Chỉ có owner mới có quyền truy cập.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const authUserId = authUser.userId;

  let joinError: string | null = null;
  if (authUserId) {
    playgroundManager.onStreamConnect(authUserId);
    const joinRes = await playgroundManager.joinRoom(authUserId, roomId, true);
    if (!joinRes.success && joinRes.error) {
      joinError = joinRes.error;
    }
  }

  let interval: NodeJS.Timeout | null = null;
  let onPlaygroundEvent: ((payload: any) => void) | null = null;
  let released = false;

  const releaseAll = () => {
    if (released) return;
    released = true;
    releaseSseConnection(limitKey);
    if (authUserId) {
      playgroundManager.onStreamDisconnect(authUserId);
    }
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
        if (onPlaygroundEvent) {
          appEventEmitter.off('playground:event', onPlaygroundEvent);
          onPlaygroundEvent = null;
        }
        releaseAll();
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

      onPlaygroundEvent = (payload: { roomId: string; event: string; data: any }) => {
        if (!payload) return;
        if (payload.roomId === 'all' || payload.roomId === roomId) {
          sendEvent(payload.event, payload.data);
        }
      };

      appEventEmitter.on('playground:event', onPlaygroundEvent);

      // Send initial snapshot of the room (already includes auto-joined authenticated user!)
      const snapshot = playgroundManager.getRoomSnapshot(roomId);
      sendEvent('init', {
        ...snapshot,
        selfUserId: authUserId,
        joinError,
      });

      // Heartbeat every 15s (also calibrates client clockOffset)
      interval = setInterval(() => {
        sendEvent('ping', { at: Date.now() });
      }, 15000);

      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (onPlaygroundEvent) {
        appEventEmitter.off('playground:event', onPlaygroundEvent);
        onPlaygroundEvent = null;
      }
      releaseAll();
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
