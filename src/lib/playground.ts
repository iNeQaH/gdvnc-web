import { appEventEmitter } from './eventEmitter';
import {
  Gamemode,
  normalizeGamemode,
  PlaygroundSegment,
  createPlaygroundSegment,
  FLOOR_SURFACE_Y,
  CEILING_SURFACE_Y,
  PLAYGROUND_WIDTH,
  PLAYER_RADIUS,
  clamp,
  getPlaygroundPhysics,
  getSurfaceAtX,
} from './playgroundPhysics';
import prisma from './prisma';

export type { Gamemode };

export interface PlaygroundPlayer {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  isSupporter: boolean;
  nameColor: string | null;
  nameGradient: string | null;
  clan: {
    id: string;
    name: string;
    tag: string;
    slug: string;
  } | null;
  iconSet: any;
  currentMode: Gamemode;
  activeRoomId: string | null; // null if browsing elsewhere on the site
  isAfk?: boolean;
  nextIdleActionAt?: number;
  nextIdleModeSwitchAt?: number;
  segment: PlaygroundSegment;
  idleSegments?: Record<string, PlaygroundSegment>;
  joinedAt: number;
  lastActiveAt: number;
}

export interface PlaygroundChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  nameColor: string | null;
  nameGradient: string | null;
  clanTag: string | null;
  roomId: string;
  text: string;
  createdAt: number;
  expiresAt: number;
}

export interface RoomStats {
  roomId: string;
  totalActive: number;
  regularActive: number;
  supporterActive: number;
  maxRegular: number;
  maxSupporter: number;
}

const BANNED_WORDS = [
  'đụ', 'địt', 'lồn', 'cặc', 'buồi', 'đm', 'dcm', 'vcl', 'clm', 'chó đẻ', 'óc chó',
  'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'nigga', 'cunt', 'dick', 'pussy',
];

export const GAMEMODES: Gamemode[] = [
  'cube',
  'jetpack',
  'ball',
  'ufo',
  'wave',
  'swing',
];

function getUsernameSeed(username: string): number {
  let hash = 2166136261;
  const str = (username || 'guest').toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function pseudoRandom(seed: number, offset: number): number {
  let s = (seed + offset * 1013904223) >>> 0;
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  return (s >>> 0) / 4294967296;
}

function randomIdleModeIntervalMs(): number {
  // Randomized interval between 3.5s and 16.5s before switching gamemode
  return Math.round(3500 + Math.random() * 13000);
}

function pickNextRandomMode(current: Gamemode): Gamemode {
  const candidates = GAMEMODES.filter((m) => m !== current);
  return candidates[Math.floor(Math.random() * candidates.length)] || 'cube';
}

function generateIdleActionForRoom(
  username: string,
  now: number,
  roomId: string,
  currentX: number,
  currentY: number,
  activeMode: Gamemode
): { x: number; y: number; hopCount: number; pauseMs: number } {
  const seed = getUsernameSeed(username);
  const cycle = Math.floor(now / 1300);
  const cycleSeed = (seed + cycle * 1009 + roomId.length * 97) >>> 0;

  // ~30% chance to NOT move left/right and instead jump/hop right in place!
  const inPlaceRoll = pseudoRandom(cycleSeed, 7);
  let targetX = currentX;
  let hopCount = 0;

  if (inPlaceRoll < 0.30) {
    targetX = currentX;
    hopCount = pseudoRandom(cycleSeed, 8) < 0.65 ? 1 : 2;
  } else {
    // Diverse horizontal travel across the 2800px map
    targetX = 80 + Math.floor(pseudoRandom(cycleSeed, 1) * (PLAYGROUND_WIDTH - 160));
    if (Math.abs(targetX - currentX) < 200) {
      targetX = ((targetX + 650) % (PLAYGROUND_WIDTH - 160)) + 80;
    }
  }

  let targetY = FLOOR_SURFACE_Y - PLAYER_RADIUS;
  if (hopCount > 0) {
    targetY = Math.max(CEILING_SURFACE_Y + PLAYER_RADIUS + 20, currentY - 90);
  } else if (activeMode === 'cube') {
    const surf = getSurfaceAtX(targetX, undefined, roomId);
    targetY = surf - PLAYER_RADIUS;
  } else if (activeMode === 'ball') {
    if (pseudoRandom(cycleSeed, 2) < 0.32) {
      targetY = CEILING_SURFACE_Y + PLAYER_RADIUS + 10;
    } else {
      const surf = getSurfaceAtX(targetX, undefined, roomId);
      targetY = surf - PLAYER_RADIUS;
    }
  } else {
    const altRatio = pseudoRandom(cycleSeed, 2);
    targetY = Math.round(135 + altRatio * 335);
  }

  // Randomized rest interval between actions:
  // 38% immediate (~90-260ms), 38% medium (~750-1600ms), 24% longer pause (~2000-3800ms)
  const pauseRoll = pseudoRandom(cycleSeed, 5);
  let pauseMs = 120;
  if (pauseRoll < 0.38) {
    pauseMs = Math.round(90 + pseudoRandom(cycleSeed, 6) * 170);
  } else if (pauseRoll < 0.76) {
    pauseMs = Math.round(750 + pseudoRandom(cycleSeed, 6) * 850);
  } else {
    pauseMs = Math.round(2000 + pseudoRandom(cycleSeed, 6) * 1800);
  }

  return { x: targetX, y: targetY, hopCount, pauseMs };
}

export class PlaygroundManager {
  private players = new Map<string, PlaygroundPlayer>();
  private chatMessages: PlaygroundChatMessage[] = [];
  private lastChatTimes = new Map<string, number>();
  private lastChatTexts = new Map<string, { text: string; time: number }>();
  private mutedUsers = new Map<string, number>();
  private disconnectDebounce = new Map<string, NodeJS.Timeout>();
  private streamCounts = new Map<string, number>();
  private streamLeaveTimers = new Map<string, NodeJS.Timeout>();
  private tickInterval: NodeJS.Timeout | null = null;

  constructor(initialPlayers?: Iterable<PlaygroundPlayer>) {
    if (initialPlayers) {
      for (const p of initialPlayers) {
        const cleanMode = normalizeGamemode(p.currentMode);
        this.players.set(p.userId, {
          ...p,
          currentMode: cleanMode,
          segment: {
            ...p.segment,
            mode: normalizeGamemode(p.segment?.mode),
            roomId: p.activeRoomId || p.segment?.roomId || 'public-1',
          },
          idleSegments: p.idleSegments || {},
        });
      }
    }
    this.startTick();
  }

  public dispose() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    for (const timer of this.disconnectDebounce.values()) clearTimeout(timer);
    for (const timer of this.streamLeaveTimers.values()) clearTimeout(timer);
    this.disconnectDebounce.clear();
    this.streamLeaveTimers.clear();
  }

  public getPlayersSnapshotList(): PlaygroundPlayer[] {
    return Array.from(this.players.values());
  }

  private startTick() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => {
      this.handleIdleTick();
      this.cleanupExpiredMessages();
    }, 320);
  }

  private cleanupExpiredMessages() {
    const now = Date.now();
    this.chatMessages = this.chatMessages.filter((m) => m.expiresAt > now);
  }

  public onStreamConnect(userId: string) {
    if (this.streamLeaveTimers.has(userId)) {
      clearTimeout(this.streamLeaveTimers.get(userId)!);
      this.streamLeaveTimers.delete(userId);
    }
    if (this.disconnectDebounce.has(userId)) {
      clearTimeout(this.disconnectDebounce.get(userId)!);
      this.disconnectDebounce.delete(userId);
    }
    const prev = this.streamCounts.get(userId) || 0;
    this.streamCounts.set(userId, prev + 1);
  }

  public onStreamDisconnect(userId: string) {
    const prev = this.streamCounts.get(userId) || 0;
    const next = Math.max(0, prev - 1);
    if (next === 0) {
      this.streamCounts.delete(userId);
      if (this.streamLeaveTimers.has(userId)) {
        clearTimeout(this.streamLeaveTimers.get(userId)!);
      }
      const timer = setTimeout(() => {
        this.streamLeaveTimers.delete(userId);
        if ((this.streamCounts.get(userId) || 0) <= 0) {
          this.leaveRoom(userId);
        }
      }, 1800);
      this.streamLeaveTimers.set(userId, timer);
    } else {
      this.streamCounts.set(userId, next);
    }
  }

  private getSegmentForRoom(player: PlaygroundPlayer, roomId: string): PlaygroundSegment {
    if (player.activeRoomId) {
      return player.segment;
    }
    if (!player.idleSegments) {
      player.idleSegments = {};
    }
    if (!player.idleSegments[roomId]) {
      const spawnX = clamp(player.segment.fromX || 600, 100, PLAYGROUND_WIDTH - 100);
      const surf = getSurfaceAtX(spawnX, undefined, roomId);
      player.idleSegments[roomId] = createPlaygroundSegment(
        spawnX,
        surf - PLAYER_RADIUS,
        spawnX,
        surf - PLAYER_RADIUS,
        player.currentMode,
        Date.now(),
        Math.random() * 1000,
        { vy: 0, isOnGround: true, rotation: 0, flipY: false, roomId }
      );
    }
    return player.idleSegments[roomId];
  }

  /**
   * Updates all Idle players:
   * 1. Independently switches gamemode after randomized intervals (3.5s - 16.5s)
   * 2. Moves across each room's unique obstacle map OR jumps in place (~30% probability)
   */
  private handleIdleTick() {
    const now = Date.now();
    for (const player of this.players.values()) {
      if (player.activeRoomId !== null && !player.isAfk) {
        continue;
      }

      const targetRooms = player.activeRoomId
        ? [player.activeRoomId]
        : this.getIdleRoomsForPlayer(player);

      // 1. Randomized gamemode switch timer
      if (!player.nextIdleModeSwitchAt) {
        player.nextIdleModeSwitchAt = now + randomIdleModeIntervalMs();
      } else if (now >= player.nextIdleModeSwitchAt) {
        const nextMode = pickNextRandomMode(player.currentMode);
        player.currentMode = nextMode;
        player.nextIdleModeSwitchAt = now + randomIdleModeIntervalMs();

        for (const roomId of targetRooms) {
          const curSeg = this.getSegmentForRoom(player, roomId);
          const phys = getPlaygroundPhysics(curSeg, now);
          const destX = phys.isFinished ? phys.x : curSeg.toX;
          const destY = phys.isFinished ? FLOOR_SURFACE_Y - PLAYER_RADIUS : curSeg.toY;
          const transitioned = createPlaygroundSegment(
            phys.x,
            phys.y,
            destX,
            destY,
            nextMode,
            now,
            Math.random() * 1000,
            {
              vy: nextMode === 'ball' ? phys.vy : Math.min(phys.vy, 300),
              isOnGround: nextMode !== 'ball' && phys.flipY ? false : phys.isOnGround,
              rotation: nextMode === 'cube' || nextMode === 'ball' ? phys.rotation : 0,
              flipY: nextMode === 'ball' ? phys.flipY : false,
              direction: phys.scaleX >= 0 ? 1 : -1,
              roomId,
            }
          );

          if (player.activeRoomId) {
            player.segment = transitioned;
          } else {
            if (!player.idleSegments) player.idleSegments = {};
            player.idleSegments[roomId] = transitioned;
          }

          this.emitToRoom(roomId, 'mode', { userId: player.userId, mode: nextMode });
          this.emitToRoom(roomId, 'segment', {
            userId: player.userId,
            mode: nextMode,
            segment: transitioned,
          });
        }
      }

      // 2. Movement / In-place jump scheduling
      if (player.nextIdleActionAt && now < player.nextIdleActionAt) {
        continue;
      }

      const primaryRoom = targetRooms[0] || 'public-1';
      const primarySeg = this.getSegmentForRoom(player, primaryRoom);
      if (now < primarySeg.startTime + primarySeg.duration) {
        continue;
      }

      let maxDuration = 600;
      let chosenPause = 500;

      for (const roomId of targetRooms) {
        const prevSeg = this.getSegmentForRoom(player, roomId);
        const phys = getPlaygroundPhysics(prevSeg, now);
        const action = generateIdleActionForRoom(
          player.username,
          now,
          roomId,
          phys.x,
          phys.y,
          player.currentMode
        );
        chosenPause = action.pauseMs;

        const nextSeg = createPlaygroundSegment(
          phys.x,
          phys.y,
          action.x,
          action.y,
          player.currentMode,
          now,
          Math.random() * 1000,
          {
            vy: phys.vy,
            isOnGround: phys.isOnGround,
            rotation: phys.rotation,
            flipY: phys.flipY,
            direction: phys.scaleX >= 0 ? 1 : -1,
            roomId,
            hopCount: action.hopCount,
          }
        );

        if (nextSeg.duration > maxDuration) maxDuration = nextSeg.duration;

        if (player.activeRoomId) {
          player.segment = nextSeg;
        } else {
          if (!player.idleSegments) player.idleSegments = {};
          player.idleSegments[roomId] = nextSeg;
        }

        this.emitToRoom(roomId, 'segment', {
          userId: player.userId,
          mode: player.currentMode,
          segment: nextSeg,
        });
      }

      player.nextIdleActionAt = now + maxDuration + chosenPause;
    }
  }

  public getIdleRoomsForPlayer(player: PlaygroundPlayer): string[] {
    const hash = player.userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const publicRoom = hash % 2 === 0 ? 'public-1' : 'public-2';
    const rooms = [publicRoom];
    if (player.clan?.slug) {
      rooms.push(`clan-${player.clan.slug}`);
    }
    return rooms;
  }

  public isPlayerInRoom(player: PlaygroundPlayer, roomId: string): boolean {
    if (player.activeRoomId === roomId) {
      return true;
    }
    if (player.activeRoomId === null) {
      const idleRooms = this.getIdleRoomsForPlayer(player);
      return idleRooms.includes(roomId);
    }
    return false;
  }

  public getRoomStats(roomId: string, excludeUserId?: string): RoomStats {
    let regularActive = 0;
    let supporterActive = 0;

    for (const player of this.players.values()) {
      if (excludeUserId && player.userId === excludeUserId) continue;
      if (player.activeRoomId === roomId && !player.isAfk) {
        if (player.isSupporter) {
          supporterActive++;
        } else {
          regularActive++;
        }
      }
    }

    return {
      roomId,
      totalActive: regularActive + supporterActive,
      regularActive,
      supporterActive,
      maxRegular: 10,
      maxSupporter: 50,
    };
  }

  public async registerSiteOnline(userId: string) {
    if (this.disconnectDebounce.has(userId)) {
      clearTimeout(this.disconnectDebounce.get(userId)!);
      this.disconnectDebounce.delete(userId);
    }

    const existing = this.players.get(userId);
    if (existing) {
      existing.lastActiveAt = Date.now();
      if (!existing.iconSet) {
        prisma.user
          .findUnique({
            where: { id: userId },
            select: { gdIconSet: true, nameColor: true, nameGradient: true },
          })
          .then((u) => {
            if (u?.gdIconSet && !existing.iconSet) {
              existing.iconSet = u.gdIconSet;
            }
            if (u?.nameColor) existing.nameColor = u.nameColor;
            if (u?.nameGradient) existing.nameGradient = u.nameGradient;
          })
          .catch(() => {});
      }
      return existing;
    }

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          supporterUntil: true,
          nameColor: true,
          nameGradient: true,
          gdIconSet: true,
          clanMember: {
            select: {
              clan: {
                select: { id: true, name: true, tag: true, slug: true },
              },
            },
          },
        },
      });

      if (!dbUser) return null;

      const isSupporter = Boolean(
        dbUser.role === 'ADMIN' ||
          dbUser.role === 'MODERATOR' ||
          (dbUser.supporterUntil && new Date(dbUser.supporterUntil) > new Date())
      );

      // Spawn inside comfortable mid-left region so initial camera view feels grounded
      const spawnX = 240 + Math.random() * 1100;
      const spawnY = FLOOR_SURFACE_Y - PLAYER_RADIUS;
      const initialMode: Gamemode = GAMEMODES[Math.floor(Math.random() * GAMEMODES.length)] || 'cube';
      const now = Date.now();

      const initialSegment = createPlaygroundSegment(
        spawnX,
        spawnY,
        spawnX,
        spawnY,
        initialMode,
        now,
        Math.random() * 1000,
        { vy: 0, isOnGround: true, rotation: 0, flipY: false, roomId: 'public-1' }
      );

      const newPlayer: PlaygroundPlayer = {
        userId: dbUser.id,
        username: dbUser.username,
        displayName: dbUser.displayName || dbUser.username,
        role: dbUser.role,
        isSupporter,
        nameColor: dbUser.nameColor,
        nameGradient: dbUser.nameGradient,
        clan: dbUser.clanMember?.clan || null,
        iconSet: dbUser.gdIconSet || null,
        currentMode: initialMode,
        activeRoomId: null,
        nextIdleModeSwitchAt: now + randomIdleModeIntervalMs(),
        segment: initialSegment,
        idleSegments: {},
        joinedAt: now,
        lastActiveAt: now,
      };

      const idleRooms = this.getIdleRoomsForPlayer(newPlayer);
      for (const roomId of idleRooms) {
        const surf = getSurfaceAtX(spawnX, undefined, roomId);
        newPlayer.idleSegments![roomId] = createPlaygroundSegment(
          spawnX,
          surf - PLAYER_RADIUS,
          spawnX,
          surf - PLAYER_RADIUS,
          initialMode,
          now,
          Math.random() * 1000,
          { vy: 0, isOnGround: true, rotation: 0, flipY: false, roomId }
        );
      }

      this.players.set(userId, newPlayer);

      for (const roomId of idleRooms) {
        this.emitToRoom(roomId, 'spawn', {
          player: this.formatPlayerForClient(newPlayer, roomId),
        });
      }

      return newPlayer;
    } catch (e) {
      console.error('[PlaygroundManager] registerSiteOnline error:', e);
      return null;
    }
  }

  public unregisterSiteOnline(userId: string) {
    if (this.disconnectDebounce.has(userId)) {
      clearTimeout(this.disconnectDebounce.get(userId)!);
    }

    const timer = setTimeout(() => {
      this.disconnectDebounce.delete(userId);
      if ((this.streamCounts.get(userId) || 0) > 0) return;
      const player = this.players.get(userId);
      if (!player) return;

      const rooms = player.activeRoomId
        ? [player.activeRoomId]
        : this.getIdleRoomsForPlayer(player);

      this.players.delete(userId);

      for (const roomId of rooms) {
        this.emitToRoom(roomId, 'despawn', { userId });
        this.emitToRoom(roomId, 'room-stats', this.getRoomStats(roomId));
      }
    }, 4000);

    this.disconnectDebounce.set(userId, timer);
  }

  public async joinRoom(
    userId: string,
    targetRoomId: string,
    wakeOnEntry = false
  ): Promise<{ success: boolean; error?: string }> {
    if (this.streamLeaveTimers.has(userId)) {
      clearTimeout(this.streamLeaveTimers.get(userId)!);
      this.streamLeaveTimers.delete(userId);
    }

    let player = this.players.get(userId);
    if (!player) {
      player = (await this.registerSiteOnline(userId)) || undefined;
    }
    if (!player) {
      return { success: false, error: 'Không tìm thấy thông tin người dùng.' };
    }

    // Always ensure fresh iconSet and styling on room entry
    if (!player.iconSet) {
      try {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { gdIconSet: true, nameColor: true, nameGradient: true },
        });
        if (u?.gdIconSet) {
          player.iconSet = u.gdIconSet;
        }
        if (u?.nameColor) player.nameColor = u.nameColor;
        if (u?.nameGradient) player.nameGradient = u.nameGradient;
      } catch {
        /* ignore */
      }
    }

    if (targetRoomId.startsWith('clan-')) {
      const clanSlug = targetRoomId.replace('clan-', '');
      if (!player.clan || player.clan.slug !== clanSlug) {
        return { success: false, error: 'Bạn không thuộc Clan của phòng này!' };
      }
    }

    const stats = this.getRoomStats(targetRoomId, userId);
    const hasCapacity = player.isSupporter
      ? stats.totalActive < stats.maxSupporter
      : stats.regularActive < stats.maxRegular;

    if (wakeOnEntry && player.isAfk && hasCapacity) {
      player.isAfk = false;
    }

    if (!player.isAfk && !hasCapacity) {
      if (!player.isSupporter) {
        return {
          success: false,
          error: `Phòng đã đầy (${stats.maxRegular}/${stats.maxRegular} người chơi). Nâng cấp Supporter hoặc bật Idle để vào xem!`,
        };
      }
      return {
        success: false,
        error: `Phòng đã đầy tối đa ${stats.maxSupporter} người chơi! Bật Idle để vào xem.`,
      };
    }

    const oldRoomId = player.activeRoomId;
    const now = Date.now();
    const prevRoomSeg =
      oldRoomId === targetRoomId
        ? player.segment
        : player.idleSegments?.[targetRoomId] || player.segment;

    player.activeRoomId = targetRoomId;
    player.currentMode = normalizeGamemode(player.currentMode);
    player.lastActiveAt = now;

    if (oldRoomId === null) {
      for (const idleRoom of this.getIdleRoomsForPlayer(player)) {
        if (idleRoom !== targetRoomId) {
          this.emitToRoom(idleRoom, 'despawn', { userId });
        }
      }
    } else if (oldRoomId !== targetRoomId) {
      this.emitToRoom(oldRoomId, 'despawn', { userId });
      this.emitToRoom(oldRoomId, 'room-stats', this.getRoomStats(oldRoomId));
    }

    if (oldRoomId !== targetRoomId || wakeOnEntry) {
      const phys = getPlaygroundPhysics(prevRoomSeg, now);
      // Place cleanly on the new room's supporting surface if switching rooms
      const startX = clamp(phys.x, 120, PLAYGROUND_WIDTH - 120);
      const startY =
        oldRoomId !== targetRoomId
          ? getSurfaceAtX(startX, phys.y, targetRoomId) - PLAYER_RADIUS
          : phys.y;

      player.segment = createPlaygroundSegment(
        startX,
        startY,
        startX,
        startY,
        player.currentMode,
        now,
        Math.random() * 1000,
        {
          vy: oldRoomId !== targetRoomId ? 0 : phys.vy,
          isOnGround: oldRoomId !== targetRoomId ? true : phys.isOnGround,
          rotation: 0,
          flipY: false,
          direction: phys.scaleX >= 0 ? 1 : -1,
          roomId: targetRoomId,
        }
      );

      this.emitToRoom(targetRoomId, 'spawn', {
        player: this.formatPlayerForClient(player, targetRoomId),
      });
    }

    this.emitToRoom(targetRoomId, 'room-stats', this.getRoomStats(targetRoomId));
    return { success: true };
  }

  public async ensurePlayerInRoom(
    userId: string,
    preferredRoomId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const player = this.players.get(userId);
    if (player && player.activeRoomId && (!preferredRoomId || player.activeRoomId === preferredRoomId)) {
      return { success: true };
    }
    return this.joinRoom(userId, preferredRoomId || player?.activeRoomId || 'public-1');
  }

  public leaveRoom(userId: string) {
    if (this.streamLeaveTimers.has(userId)) {
      clearTimeout(this.streamLeaveTimers.get(userId)!);
      this.streamLeaveTimers.delete(userId);
    }

    const player = this.players.get(userId);
    if (!player || !player.activeRoomId) return;

    const oldRoomId = player.activeRoomId;
    const now = Date.now();
    const phys = getPlaygroundPhysics(player.segment, now);
    player.activeRoomId = null;
    player.nextIdleModeSwitchAt = now + randomIdleModeIntervalMs();

    this.emitToRoom(oldRoomId, 'despawn', { userId });
    this.emitToRoom(oldRoomId, 'room-stats', this.getRoomStats(oldRoomId));

    if (!player.idleSegments) player.idleSegments = {};
    const idleRooms = this.getIdleRoomsForPlayer(player);
    for (const roomId of idleRooms) {
      const surf = getSurfaceAtX(phys.x, phys.y, roomId);
      player.idleSegments[roomId] = createPlaygroundSegment(
        phys.x,
        surf - PLAYER_RADIUS,
        phys.x,
        surf - PLAYER_RADIUS,
        player.currentMode,
        now,
        Math.random() * 1000,
        { vy: 0, isOnGround: true, rotation: 0, flipY: false, roomId }
      );
      this.emitToRoom(roomId, 'spawn', {
        player: this.formatPlayerForClient(player, roomId),
      });
    }
  }

  public async handleUserMove(
    userId: string,
    toX: number,
    toY: number,
    opts?: { roomId?: string; clientTime?: number; seed?: number; segId?: string }
  ): Promise<{ success: boolean; segment?: PlaygroundSegment; serverTime?: number; error?: string }> {
    const ensured = await this.ensurePlayerInRoom(userId, opts?.roomId);
    if (!ensured.success) {
      return { success: false, error: ensured.error };
    }

    const player = this.players.get(userId);
    if (!player || !player.activeRoomId) {
      return { success: false, error: 'Bạn chưa ở trong phòng chơi.' };
    }

    const serverNow = Date.now();

    if (player.isAfk) {
      const stats = this.getRoomStats(player.activeRoomId, userId);
      if (!player.isSupporter && stats.regularActive >= stats.maxRegular) {
        return {
          success: false,
          error: `Phòng đã đầy (${stats.maxRegular}/${stats.maxRegular} người chơi). Không thể tắt Idle lúc này!`,
        };
      }
      if (player.isSupporter && stats.totalActive >= stats.maxSupporter) {
        return {
          success: false,
          error: `Phòng đã đầy tối đa ${stats.maxSupporter} người chơi!`,
        };
      }
      player.isAfk = false;
      this.emitToRoom(player.activeRoomId, 'afk', {
        userId,
        isAfk: false,
        isActiveInRoom: true,
      });
      this.emitToRoom(player.activeRoomId, 'room-stats', this.getRoomStats(player.activeRoomId));
    }

    const minAllowedTime = Math.min(serverNow, Math.max(player.segment.startTime, serverNow - 350));
    const maxAllowedTime = serverNow + 60;
    const effectiveTime =
      typeof opts?.clientTime === 'number' && Number.isFinite(opts.clientTime)
        ? clamp(Math.round(opts.clientTime), minAllowedTime, maxAllowedTime)
        : serverNow;

    const currentPhysics = getPlaygroundPhysics(player.segment, effectiveTime);
    const seed =
      typeof opts?.seed === 'number' && Number.isFinite(opts.seed)
        ? opts.seed
        : Math.random() * 1000;

    const segment = createPlaygroundSegment(
      currentPhysics.x,
      currentPhysics.y,
      toX,
      toY,
      player.currentMode,
      effectiveTime,
      seed,
      {
        vy: currentPhysics.vy,
        isOnGround: currentPhysics.isOnGround,
        rotation: currentPhysics.rotation,
        flipY: currentPhysics.flipY,
        direction: currentPhysics.scaleX >= 0 ? 1 : -1,
        id: opts?.segId,
        roomId: player.activeRoomId,
      }
    );

    player.segment = segment;
    player.lastActiveAt = serverNow;

    this.emitToRoom(player.activeRoomId, 'segment', {
      userId,
      mode: player.currentMode,
      segment,
    });

    return { success: true, segment, serverTime: serverNow };
  }

  public async handleSetMode(
    userId: string,
    mode: Gamemode,
    opts?: { roomId?: string; clientTime?: number; seed?: number; segId?: string }
  ): Promise<{ success: boolean; segment?: PlaygroundSegment; serverTime?: number; error?: string }> {
    if (!GAMEMODES.includes(mode)) {
      return { success: false, error: 'Gamemode không hợp lệ.' };
    }

    const ensured = await this.ensurePlayerInRoom(userId, opts?.roomId);
    if (!ensured.success) {
      return { success: false, error: ensured.error };
    }

    const player = this.players.get(userId);
    if (!player || !player.activeRoomId) {
      return { success: false, error: 'Bạn chưa ở trong phòng chơi.' };
    }

    const serverNow = Date.now();
    const minAllowedTime = Math.min(serverNow, Math.max(player.segment.startTime, serverNow - 350));
    const effectiveTime =
      typeof opts?.clientTime === 'number' && Number.isFinite(opts.clientTime)
        ? clamp(Math.round(opts.clientTime), minAllowedTime, serverNow + 60)
        : serverNow;

    const currentPhysics = getPlaygroundPhysics(player.segment, effectiveTime);
    player.currentMode = mode;
    player.lastActiveAt = serverNow;
    if (player.isAfk) {
      player.nextIdleModeSwitchAt = serverNow + randomIdleModeIntervalMs();
    }

    const seed =
      typeof opts?.seed === 'number' && Number.isFinite(opts.seed)
        ? opts.seed
        : Math.random() * 1000;
    const destX = currentPhysics.isFinished ? currentPhysics.x : player.segment.toX;
    const destY = currentPhysics.isFinished ? FLOOR_SURFACE_Y - PLAYER_RADIUS : player.segment.toY;

    const nextSegment = createPlaygroundSegment(
      currentPhysics.x,
      currentPhysics.y,
      destX,
      destY,
      mode,
      effectiveTime,
      seed,
      {
        vy: mode === 'ball' ? currentPhysics.vy : Math.min(currentPhysics.vy, 300),
        isOnGround: mode !== 'ball' && currentPhysics.flipY ? false : currentPhysics.isOnGround,
        rotation: mode === 'cube' || mode === 'ball' ? currentPhysics.rotation : 0,
        flipY: mode === 'ball' ? currentPhysics.flipY : false,
        direction: currentPhysics.scaleX >= 0 ? 1 : -1,
        id: opts?.segId,
        roomId: player.activeRoomId,
      }
    );

    player.segment = nextSegment;

    this.emitToRoom(player.activeRoomId, 'mode', {
      userId,
      mode,
    });
    this.emitToRoom(player.activeRoomId, 'segment', {
      userId,
      mode,
      segment: nextSegment,
    });

    return { success: true, segment: nextSegment, serverTime: serverNow };
  }

  public async handleChat(
    userId: string,
    rawText: string,
    roomId?: string
  ): Promise<{ success: boolean; message?: PlaygroundChatMessage; serverTime?: number; error?: string }> {
    const ensured = await this.ensurePlayerInRoom(userId, roomId);
    if (!ensured.success) {
      return { success: false, error: ensured.error };
    }

    const player = this.players.get(userId);
    if (!player || !player.activeRoomId) {
      return { success: false, error: 'Bạn phải ở trong phòng để gửi chat.' };
    }

    const now = Date.now();

    const unmutedAt = this.mutedUsers.get(userId) || 0;
    if (now < unmutedAt) {
      const minutesLeft = Math.ceil((unmutedAt - now) / 60000);
      return {
        success: false,
        error: `Bạn đang bị cấm chat trong ${minutesLeft} phút nữa.`,
      };
    }

    const lastChat = this.lastChatTimes.get(userId) || 0;
    if (now - lastChat < 3000) {
      const waitSec = Math.ceil((3000 - (now - lastChat)) / 1000);
      return {
        success: false,
        error: `Vui lòng đợi ${waitSec}s trước khi gửi tin nhắn tiếp theo.`,
      };
    }

    const text = rawText.trim().replace(/\s+/g, ' ');
    if (!text) {
      return { success: false, error: 'Tin nhắn không được để trống.' };
    }
    if (text.length > 120) {
      return { success: false, error: 'Tin nhắn tối đa 120 ký tự.' };
    }

    if (/(.)\1{7,}/i.test(text)) {
      return {
        success: false,
        error: 'Tin nhắn chứa chuỗi ký tự lặp quá nhiều.',
      };
    }

    const prevChat = this.lastChatTexts.get(userId);
    if (prevChat && prevChat.text.toLowerCase() === text.toLowerCase() && now - prevChat.time < 30000) {
      return {
        success: false,
        error: 'Vui lòng không gửi lặp lại cùng một tin nhắn.',
      };
    }

    const lowerText = text.toLowerCase();
    for (const word of BANNED_WORDS) {
      if (lowerText.includes(word)) {
        return {
          success: false,
          error: 'Tin nhắn chứa từ ngữ không phù hợp quy định kiểm duyệt.',
        };
      }
    }

    const ttlMs = Math.min(12000, Math.max(3500, Math.round(2500 + text.length * 85)));

    const chatMsg: PlaygroundChatMessage = {
      id: `chat-${now}-${Math.random().toString(36).slice(2, 7)}`,
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      nameColor: player.nameColor,
      nameGradient: player.nameGradient,
      clanTag: player.clan?.tag || null,
      roomId: player.activeRoomId,
      text,
      createdAt: now,
      expiresAt: now + ttlMs,
    };

    this.lastChatTimes.set(userId, now);
    this.lastChatTexts.set(userId, { text, time: now });
    this.chatMessages.push(chatMsg);

    this.emitToRoom(player.activeRoomId, 'chat', chatMsg);

    return { success: true, message: chatMsg, serverTime: now };
  }

  public deleteMessage(messageId: string, moderatorRole: string): boolean {
    if (moderatorRole !== 'ADMIN' && moderatorRole !== 'MODERATOR') return false;

    const idx = this.chatMessages.findIndex((m) => m.id === messageId);
    if (idx === -1) return false;

    const [deleted] = this.chatMessages.splice(idx, 1);
    this.emitToRoom(deleted.roomId, 'chat-delete', { messageId });
    return true;
  }

  public muteUser(targetUserId: string, minutes: number, moderatorRole: string): boolean {
    if (moderatorRole !== 'ADMIN' && moderatorRole !== 'MODERATOR') return false;
    this.mutedUsers.set(targetUserId, Date.now() + minutes * 60 * 1000);
    return true;
  }

  public getRoomSnapshot(roomId: string) {
    const now = Date.now();
    const playersInRoom: Array<ReturnType<typeof this.formatPlayerForClient>> = [];

    for (const player of this.players.values()) {
      if (this.isPlayerInRoom(player, roomId)) {
        playersInRoom.push(this.formatPlayerForClient(player, roomId));
      }
    }

    const activeChats = this.chatMessages.filter(
      (m) => m.roomId === roomId && m.expiresAt > now
    );

    return {
      serverTime: now,
      stats: this.getRoomStats(roomId),
      players: playersInRoom,
      chats: activeChats,
    };
  }

  public async setPlayerAfk(
    userId: string,
    isAfk: boolean,
    targetRoomId?: string
  ): Promise<{ success: boolean; error?: string }> {
    let player = this.players.get(userId);
    if (!player) {
      player = (await this.registerSiteOnline(userId)) || undefined;
    }
    if (!player) {
      return { success: false, error: 'Không tìm thấy thông tin người dùng.' };
    }

    // Always ensure fresh iconSet and styling on room entry
    if (!player.iconSet) {
      try {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { gdIconSet: true, nameColor: true, nameGradient: true },
        });
        if (u?.gdIconSet) {
          player.iconSet = u.gdIconSet;
        }
        if (u?.nameColor) player.nameColor = u.nameColor;
        if (u?.nameGradient) player.nameGradient = u.nameGradient;
      } catch {
        /* ignore */
      }
    }

    const roomIdToUse = targetRoomId || player.activeRoomId || 'public-1';
    if (!isAfk) {
      const stats = this.getRoomStats(roomIdToUse, userId);
      if (!player.isSupporter && stats.regularActive >= stats.maxRegular) {
        return {
          success: false,
          error: `Phòng đã đầy (${stats.maxRegular}/${stats.maxRegular} người chơi). Không thể tắt Idle lúc này!`,
        };
      }
      if (player.isSupporter && stats.totalActive >= stats.maxSupporter) {
        return {
          success: false,
          error: `Phòng đã đầy tối đa ${stats.maxSupporter} người chơi!`,
        };
      }
    }

    player.isAfk = isAfk;
    if (targetRoomId) {
      player.activeRoomId = targetRoomId;
    }
    const now = Date.now();
    player.lastActiveAt = now;

    const rooms = player.activeRoomId ? [player.activeRoomId] : this.getIdleRoomsForPlayer(player);

    for (const roomId of rooms) {
      this.emitToRoom(roomId, 'afk', {
        userId,
        isAfk,
        isActiveInRoom: player.activeRoomId === roomId && !isAfk,
      });
      this.emitToRoom(roomId, 'room-stats', this.getRoomStats(roomId));
    }

    if (isAfk) {
      player.nextIdleModeSwitchAt = now + randomIdleModeIntervalMs();

      for (const roomId of rooms) {
        const curSeg = this.getSegmentForRoom(player, roomId);
        const phys = getPlaygroundPhysics(curSeg, now);
        const action = generateIdleActionForRoom(
          player.username,
          now,
          roomId,
          phys.x,
          phys.y,
          player.currentMode
        );
        const nextSeg = createPlaygroundSegment(
          phys.x,
          phys.y,
          action.x,
          action.y,
          player.currentMode,
          now,
          Math.random() * 1000,
          {
            vy: phys.vy,
            isOnGround: phys.isOnGround,
            rotation: phys.rotation,
            flipY: phys.flipY,
            direction: phys.scaleX >= 0 ? 1 : -1,
            roomId,
            hopCount: action.hopCount,
          }
        );

        if (player.activeRoomId) {
          player.segment = nextSeg;
        } else {
          if (!player.idleSegments) player.idleSegments = {};
          player.idleSegments[roomId] = nextSeg;
        }
        player.nextIdleActionAt = now + nextSeg.duration + action.pauseMs;

        this.emitToRoom(roomId, 'segment', {
          userId: player.userId,
          mode: player.currentMode,
          segment: nextSeg,
        });
      }
    } else {
      const activeRoom = player.activeRoomId || 'public-1';
      const phys = getPlaygroundPhysics(player.segment, now);
      const restSegment = createPlaygroundSegment(
        phys.x,
        phys.y,
        phys.x,
        phys.y,
        player.currentMode,
        now,
        Math.random() * 1000,
        {
          vy: phys.vy,
          isOnGround: phys.isOnGround,
          rotation: phys.rotation,
          flipY: phys.flipY,
          direction: phys.scaleX >= 0 ? 1 : -1,
          roomId: activeRoom,
        }
      );
      player.segment = restSegment;

      for (const roomId of rooms) {
        this.emitToRoom(roomId, 'segment', {
          userId: player.userId,
          mode: player.currentMode,
          segment: restSegment,
        });
      }
    }

    return { success: true };
  }

  private formatPlayerForClient(player: PlaygroundPlayer, roomId: string) {
    const isActiveInRoom = player.activeRoomId === roomId && !player.isAfk;
    const cleanMode = normalizeGamemode(player.currentMode);
    const seg = this.getSegmentForRoom(player, roomId);
    return {
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      role: player.role,
      isSupporter: player.isSupporter,
      nameColor: player.nameColor,
      nameGradient: player.nameGradient,
      clan: player.clan,
      iconSet: player.iconSet,
      currentMode: cleanMode,
      isActiveInRoom,
      isAfk: Boolean(player.isAfk),
      segment: {
        ...seg,
        roomId: seg.roomId || roomId,
        mode: normalizeGamemode(seg?.mode),
      },
    };
  }

  public updatePlayerIconSet(userId: string, iconSet: any) {
    const player = this.players.get(userId);
    if (!player) return;
    player.iconSet = iconSet;
    const idleRooms = this.getIdleRoomsForPlayer(player);
    for (const roomId of idleRooms) {
      this.emitToRoom(roomId, 'update', {
        player: this.formatPlayerForClient(player, roomId),
      });
    }
  }

  private emitToRoom(roomId: string, event: string, data: any) {
    appEventEmitter.emit('playground:event', { roomId, event, data });
  }
}

// Global singleton with clean HMR migration
const PLAYGROUND_VERSION = 6;
const globalForPlayground = globalThis as unknown as {
  __gdvnPlayground?: PlaygroundManager & { __version?: number };
};

function createOrUpgradePlayground(): PlaygroundManager {
  const existing = globalForPlayground.__gdvnPlayground;
  if (existing && (existing as any).__version === PLAYGROUND_VERSION) {
    return existing;
  }

  let preservedPlayers: PlaygroundPlayer[] = [];
  if (existing) {
    try {
      if (typeof existing.getPlayersSnapshotList === 'function') {
        preservedPlayers = existing.getPlayersSnapshotList();
      } else if ((existing as any).players instanceof Map) {
        preservedPlayers = Array.from((existing as any).players.values());
      }
      if (typeof existing.dispose === 'function') {
        existing.dispose();
      } else if ((existing as any).tickInterval) {
        clearInterval((existing as any).tickInterval);
      }
    } catch {
      /* ignore HMR cleanup error */
    }
  }

  const next = new PlaygroundManager(preservedPlayers) as PlaygroundManager & {
    __version?: number;
  };
  next.__version = PLAYGROUND_VERSION;
  globalForPlayground.__gdvnPlayground = next;
  return next;
}

export const playgroundManager = createOrUpgradePlayground();
