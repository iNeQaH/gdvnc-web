import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { playgroundManager } from '@/lib/playground';
import { Gamemode } from '@/lib/playgroundPhysics';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(request: Request) {
  if (!isBrowserSameOriginFetch(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const session = await getSessionUser();
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để thực hiện thao tác.' },
        { status: 401 }
      );
    }

    const limited = rateLimit(`pg-act:${session.userId}`, 25, 1000);
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'join': {
        const { roomId } = body;
        if (!roomId || typeof roomId !== 'string') {
          return NextResponse.json({ error: 'Phòng không hợp lệ.' }, { status: 400 });
        }
        const res = await playgroundManager.joinRoom(session.userId, roomId);
        if (!res.success) {
          return NextResponse.json(
            { error: res.error, serverTime: Date.now() },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true, serverTime: Date.now() });
      }

      case 'leave': {
        playgroundManager.leaveRoom(session.userId);
        return NextResponse.json({ success: true, serverTime: Date.now() });
      }

      case 'setAfk': {
        const { isAfk, roomId } = body;
        const res = await playgroundManager.setPlayerAfk(
          session.userId,
          Boolean(isAfk),
          typeof roomId === 'string' ? roomId : undefined
        );
        if (!res.success) {
          return NextResponse.json(
            { error: res.error, serverTime: Date.now() },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          isAfk: Boolean(isAfk),
          serverTime: Date.now(),
        });
      }

      case 'move': {
        const { toX, toY, roomId, clientTime, seed, segId } = body;
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          return NextResponse.json({ error: 'Toạ độ không hợp lệ.' }, { status: 400 });
        }
        const res = await playgroundManager.handleUserMove(session.userId, toX, toY, {
          roomId: typeof roomId === 'string' ? roomId : undefined,
          clientTime: typeof clientTime === 'number' ? clientTime : undefined,
          seed: typeof seed === 'number' ? seed : undefined,
          segId: typeof segId === 'string' ? segId : undefined,
        });
        if (!res.success) {
          return NextResponse.json(
            { error: res.error, serverTime: Date.now() },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          segment: res.segment,
          serverTime: res.serverTime ?? Date.now(),
        });
      }

      case 'setMode': {
        const { mode, roomId, clientTime, seed, segId } = body;
        const res = await playgroundManager.handleSetMode(session.userId, mode as Gamemode, {
          roomId: typeof roomId === 'string' ? roomId : undefined,
          clientTime: typeof clientTime === 'number' ? clientTime : undefined,
          seed: typeof seed === 'number' ? seed : undefined,
          segId: typeof segId === 'string' ? segId : undefined,
        });
        if (!res.success) {
          return NextResponse.json(
            { error: res.error, serverTime: Date.now() },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          segment: res.segment,
          serverTime: res.serverTime ?? Date.now(),
        });
      }

      case 'chat': {
        const { text, roomId } = body;
        if (typeof text !== 'string' || text.length > 500) {
          return NextResponse.json({ error: 'Nội dung chat không hợp lệ (tối đa 500 ký tự).' }, { status: 400 });
        }
        const res = await playgroundManager.handleChat(
          session.userId,
          text,
          typeof roomId === 'string' ? roomId : undefined
        );
        if (!res.success) {
          return NextResponse.json(
            { error: res.error, serverTime: Date.now() },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          message: res.message,
          serverTime: res.serverTime ?? Date.now(),
        });
      }

      case 'deleteChat': {
        const { messageId } = body;
        if (!messageId || typeof messageId !== 'string') {
          return NextResponse.json({ error: 'ID tin nhắn không hợp lệ.' }, { status: 400 });
        }
        const ok = playgroundManager.deleteMessage(messageId, session.role || 'USER');
        if (!ok) {
          return NextResponse.json(
            { error: 'Không thể xoá tin nhắn hoặc không đủ quyền.' },
            { status: 403 }
          );
        }
        return NextResponse.json({ success: true, serverTime: Date.now() });
      }

      case 'eatFood': {
        const { foodId, roomId } = body;
        if (!foodId || typeof foodId !== 'string' || !roomId || typeof roomId !== 'string') {
          return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
        }
        const ok = playgroundManager.handleEatFood(session.userId, foodId, roomId);
        return NextResponse.json({ success: ok, serverTime: Date.now() });
      }

      case 'mute': {
        const { targetUserId, minutes = 5 } = body;
        if (!targetUserId || typeof targetUserId !== 'string') {
          return NextResponse.json({ error: 'ID người dùng không hợp lệ.' }, { status: 400 });
        }
        const rawMin = Number(minutes);
        const clampedMinutes = Number.isFinite(rawMin) ? Math.min(1440, Math.max(1, Math.floor(rawMin))) : 5;
        const ok = playgroundManager.muteUser(
          targetUserId,
          clampedMinutes,
          session.role || 'USER'
        );
        if (!ok) {
          return NextResponse.json({ error: 'Không đủ quyền cấm chat.' }, { status: 403 });
        }
        return NextResponse.json({ success: true, serverTime: Date.now() });
      }

      default:
        return NextResponse.json({ error: 'Thao tác không được hỗ trợ.' }, { status: 400 });
    }
  } catch (e: any) {
    console.error('[playground action error]:', e);
    return NextResponse.json({ error: e?.message || 'Lỗi xử lý server.' }, { status: 500 });
  }
}
