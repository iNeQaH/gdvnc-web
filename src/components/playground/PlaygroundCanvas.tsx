'use client';

import React, { useEffect, useRef } from 'react';
import {
  Gamemode,
  normalizeGamemode,
  PlaygroundSegment,
  getPlaygroundPhysics,
  getRoomObstacles,
  getRoomLayoutKey,
  clamp,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
  PLAYGROUND_WIDTH,
  PLAYGROUND_HEIGHT,
  CAMERA_LEFT_PUSH_RATIO,
  CAMERA_RIGHT_PUSH_RATIO,
  FLOOR_SURFACE_Y,
  CEILING_SURFACE_Y,
  PLAYER_RADIUS,
  PhysicsResult,
} from '@/lib/playgroundPhysics';

export interface ClientPlayer {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  isSupporter: boolean;
  nameColor: string | null;
  nameGradient: string | null;
  clan: { id: string; name: string; tag: string; slug: string } | null;
  iconSet: any;
  currentMode: Gamemode;
  isActiveInRoom: boolean;
  isAfk?: boolean;
  segment: PlaygroundSegment;
  spawnedAt?: number;
  despawnedAt?: number;
}

export interface ClientChat {
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

interface PlaygroundCanvasProps {
  roomId: string;
  players: ClientPlayer[];
  chats: ClientChat[];
  currentUserId?: string | null;
  isStaff?: boolean;
  onMove?: (toX: number, toY: number) => void;
  onDeleteChat?: (messageId: string) => void;
  clockOffset?: number;
}

interface ClickRipple {
  x: number;
  y: number;
  createdAt: number;
}

interface VisualContinuityState {
  segKey: string;
  renderedX: number;
  renderedY: number;
  offsetX: number;
  offsetY: number;
  lastClientTime: number;
}

const VEHICLE_HEIGHTS: Record<Gamemode, number> = {
  cube: 42,
  jetpack: 40,
  ball: 40,
  ufo: 38,
  wave: 28,
  swing: 40,
};

const ROOM_THEMES: Record<'r1' | 'r2' | 'clan', { accent: string; border: string; stripe: string }> = {
  r1: {
    accent: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.42)',
    stripe: 'rgba(56, 189, 248, 0.045)',
  },
  r2: {
    accent: '#a78bfa',
    border: 'rgba(167, 139, 250, 0.44)',
    stripe: 'rgba(167, 139, 250, 0.05)',
  },
  clan: {
    accent: '#fbbf24',
    border: 'rgba(251, 191, 36, 0.44)',
    stripe: 'rgba(251, 191, 36, 0.05)',
  },
};

export const PlaygroundCanvas: React.FC<PlaygroundCanvasProps> = ({
  roomId,
  players,
  chats,
  currentUserId,
  isStaff,
  onMove,
  onDeleteChat,
  clockOffset = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const ripplesRef = useRef<ClickRipple[]>([]);
  const waveTrailsRef = useRef<Map<string, Array<{ x: number; y: number; t: number }>>>(new Map());
  const visualContinuityRef = useRef<Map<string, VisualContinuityState>>(new Map());
  const deleteBtnBoundsRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());
  const lastShakeTimeRef = useRef<number>(0);

  // Camera state (world X offset of left viewport edge)
  const cameraXRef = useRef<number>(0);
  const targetCameraXRef = useRef<number>(0);
  const cameraRoomRef = useRef<string>('');
  const lastCamFrameAtRef = useRef<number>(Date.now());

  const latestPropsRef = useRef({
    roomId,
    players,
    chats,
    currentUserId,
    isStaff,
    onDeleteChat,
    clockOffset,
  });
  latestPropsRef.current = {
    roomId,
    players,
    chats,
    currentUserId,
    isStaff,
    onDeleteChat,
    clockOffset,
  };

  const getIconUrl = (player: ClientPlayer, mode: Gamemode) => {
    const iconSet = player.iconSet || {};
    const iconId = iconSet[mode] ?? 1;
    const col1 = iconSet.color1 ?? 0;
    const col2 = iconSet.color2 ?? 3;
    const glow = iconSet.glow ?? false;
    const colG = iconSet.colorGlow ?? iconSet.color3 ?? col2;
    return `/api/gd/icon?form=${mode}&icon=${iconId}&col1=${col1}&col2=${col2}${glow ? `&glow=1&colG=${colG}` : ''}&size=128&v=3`;
  };

  const getImage = (url: string): HTMLImageElement | null => {
    let img = imageCache.current.get(url);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      imageCache.current.set(url, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  };

  // Convert viewport click into exact world coordinates (viewX + cameraX)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = VIEWPORT_WIDTH / rect.width;
    const scaleY = VIEWPORT_HEIGHT / rect.height;
    const viewX = (e.clientX - rect.left) * scaleX;
    const worldClickX = clamp(viewX + cameraXRef.current, 45, PLAYGROUND_WIDTH - 45);
    const worldClickY = (e.clientY - rect.top) * scaleY;

    // Staff delete chat check in world coordinates
    if (isStaff && onDeleteChat) {
      for (const [chatId, bounds] of deleteBtnBoundsRef.current.entries()) {
        if (
          worldClickX >= bounds.x &&
          worldClickX <= bounds.x + bounds.w &&
          worldClickY >= bounds.y &&
          worldClickY <= bounds.y + bounds.h
        ) {
          onDeleteChat(chatId);
          return;
        }
      }
    }

    if (onMove) {
      ripplesRef.current.push({ x: worldClickX, y: worldClickY, createdAt: Date.now() });
      onMove(worldClickX, worldClickY);
    }
  };

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const {
        roomId: curRoomId,
        players: curPlayers,
        chats: curChats,
        currentUserId: curUserId,
        isStaff: curIsStaff,
        onDeleteChat: curOnDeleteChat,
        clockOffset: curClockOffset,
      } = latestPropsRef.current;

      const clientNow = Date.now();
      const now = clientNow + curClockOffset;
      const camDtMs = clamp(clientNow - lastCamFrameAtRef.current, 1, 100);
      lastCamFrameAtRef.current = clientNow;

      const layoutKey = getRoomLayoutKey(curRoomId);
      const roomObstacles = getRoomObstacles(curRoomId);
      const roomTheme = ROOM_THEMES[layoutKey];
      const maxCameraX = Math.max(0, PLAYGROUND_WIDTH - VIEWPORT_WIDTH);

      // Clean stale visual continuity entries
      const activeIds = new Set(curPlayers.map((p) => p.userId));
      for (const uid of visualContinuityRef.current.keys()) {
        if (!activeIds.has(uid)) {
          visualContinuityRef.current.delete(uid);
          waveTrailsRef.current.delete(uid);
        }
      }

      // Evaluate all players' world positions first so camera push-zone tracks local player cleanly
      const sortedPlayers = [...curPlayers].sort((a, b) => {
        const aFull = a.isActiveInRoom && !a.isAfk;
        const bFull = b.isActiveInRoom && !b.isAfk;
        if (aFull === bFull) return 0;
        return aFull ? 1 : -1;
      });

      const evaluatedPlayers: Array<{
        player: ClientPlayer;
        physics: PhysicsResult;
        currentMode: Gamemode;
        drawX: number;
        drawY: number;
      }> = [];
      const playerPositions = new Map<string, { x: number; y: number }>();

      for (const player of sortedPlayers) {
        const segWithRoom: PlaygroundSegment = player.segment.roomId
          ? player.segment
          : { ...player.segment, roomId: curRoomId };
        const physics = getPlaygroundPhysics(segWithRoom, now);
        const currentMode = normalizeGamemode(player.currentMode);

        const segKey =
          segWithRoom.id ||
          `${curRoomId}_${segWithRoom.startTime}_${segWithRoom.toX.toFixed(1)}_${segWithRoom.toY.toFixed(1)}_${currentMode}`;
        const prevCont = visualContinuityRef.current.get(player.userId);
        let drawX = physics.x;
        let drawY = physics.y;

        if (!prevCont || !prevCont.segKey.startsWith(`${curRoomId}_`) && prevCont.segKey !== segKey && cameraRoomRef.current !== curRoomId) {
          visualContinuityRef.current.set(player.userId, {
            segKey,
            renderedX: physics.x,
            renderedY: physics.y,
            offsetX: 0,
            offsetY: 0,
            lastClientTime: clientNow,
          });
        } else {
          const dtMs = clamp(clientNow - prevCont.lastClientTime, 0, 100);
          const decay = Math.exp(-dtMs / 55);
          let ox = prevCont.offsetX * decay;
          let oy = prevCont.offsetY * decay;

          if (prevCont.segKey !== segKey) {
            const rawDx = prevCont.renderedX - physics.x;
            const rawDy = prevCont.renderedY - physics.y;
            if (Math.hypot(rawDx, rawDy) <= 240) {
              ox = rawDx;
              oy = rawDy;
            } else {
              ox = 0;
              oy = 0;
            }
          }

          if (Math.abs(ox) < 0.05) ox = 0;
          if (Math.abs(oy) < 0.05) oy = 0;

          drawX = clamp(physics.x + ox, 30, PLAYGROUND_WIDTH - 30);
          drawY = clamp(
            physics.y + oy,
            CEILING_SURFACE_Y + PLAYER_RADIUS,
            FLOOR_SURFACE_Y - PLAYER_RADIUS
          );

          visualContinuityRef.current.set(player.userId, {
            segKey,
            renderedX: drawX,
            renderedY: drawY,
            offsetX: ox,
            offsetY: oy,
            lastClientTime: clientNow,
          });
        }

        playerPositions.set(player.userId, { x: drawX, y: drawY });
        evaluatedPlayers.push({ player, physics, currentMode, drawX, drawY });
      }

      // GD 2.2 Platformer Push-Zone Camera (32% left threshold / 68% right threshold)
      const myPos = curUserId ? playerPositions.get(curUserId) : undefined;
      if (myPos) {
        if (cameraRoomRef.current !== curRoomId) {
          cameraRoomRef.current = curRoomId;
          const centered = clamp(myPos.x - VIEWPORT_WIDTH * 0.5, 0, maxCameraX);
          targetCameraXRef.current = centered;
          cameraXRef.current = centered;
        } else {
          let targetCam = targetCameraXRef.current;
          const rightTriggerX = targetCam + VIEWPORT_WIDTH * CAMERA_RIGHT_PUSH_RATIO;
          const leftTriggerX = targetCam + VIEWPORT_WIDTH * CAMERA_LEFT_PUSH_RATIO;

          if (myPos.x > rightTriggerX) {
            targetCam = myPos.x - VIEWPORT_WIDTH * CAMERA_RIGHT_PUSH_RATIO;
          } else if (myPos.x < leftTriggerX) {
            targetCam = myPos.x - VIEWPORT_WIDTH * CAMERA_LEFT_PUSH_RATIO;
          }

          targetCam = clamp(targetCam, 0, maxCameraX);
          targetCameraXRef.current = targetCam;

          const smoothAlpha = 1 - Math.exp(-camDtMs / 40);
          cameraXRef.current += (targetCam - cameraXRef.current) * smoothAlpha;
          if (Math.abs(targetCam - cameraXRef.current) < 0.1) {
            cameraXRef.current = targetCam;
          }
        }
      } else if (cameraRoomRef.current !== curRoomId) {
        cameraRoomRef.current = curRoomId;
        targetCameraXRef.current = maxCameraX * 0.5;
        cameraXRef.current = maxCameraX * 0.5;
      }

      const cameraX = cameraXRef.current;

      // Screen shake check for high-energy spawns
      let shakeX = 0;
      let shakeY = 0;
      if (clientNow - lastShakeTimeRef.current < 90) {
        shakeX = (Math.random() - 0.5) * 6;
        shakeY = (Math.random() - 0.5) * 6;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 1. Viewport Background + Parallax Deep Grid
      ctx.clearRect(-10, -10, VIEWPORT_WIDTH + 20, VIEWPORT_HEIGHT + 20);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, VIEWPORT_HEIGHT);
      bgGrad.addColorStop(0, '#0a0d1a');
      bgGrad.addColorStop(0.5, '#070a14');
      bgGrad.addColorStop(1, '#05070f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

      // Subtle slow-scrolling parallax pillars (0.35x camera speed)
      const parallaxOffset = -(cameraX * 0.35) % 220;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.018)';
      for (let px = parallaxOffset - 220; px < VIEWPORT_WIDTH + 220; px += 220) {
        ctx.fillRect(px, CEILING_SURFACE_Y, 54, FLOOR_SURFACE_Y - CEILING_SURFACE_Y);
      }

      // === WORLD SPACE TRANSFORM (Scrolled strictly inside the canvas box!) ===
      ctx.save();
      ctx.translate(-cameraX, 0);

      // World 1x GD Grid lines (only draw visible slice for max 60fps efficiency)
      const startGridX = Math.floor(cameraX / 60) * 60;
      const endGridX = Math.min(PLAYGROUND_WIDTH, cameraX + VIEWPORT_WIDTH + 60);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.055)';
      ctx.lineWidth = 1;
      for (let gx = startGridX; gx <= endGridX; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, PLAYGROUND_HEIGHT);
        ctx.stroke();
      }
      for (let gy = 0; gy < PLAYGROUND_HEIGHT; gy += 60) {
        ctx.beginPath();
        ctx.moveTo(cameraX, gy);
        ctx.lineTo(cameraX + VIEWPORT_WIDTH, gy);
        ctx.stroke();
      }

      // 2. Ceiling, Floor & Left/Right Room Boundary Walls
      const ceilLineGrad = ctx.createLinearGradient(0, 0, PLAYGROUND_WIDTH, 0);
      ceilLineGrad.addColorStop(0, '#38bdf8');
      ceilLineGrad.addColorStop(0.5, roomTheme.accent);
      ceilLineGrad.addColorStop(1, '#c084fc');

      // Ceiling
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, PLAYGROUND_WIDTH, CEILING_SURFACE_Y - 2);
      ctx.fillStyle = ceilLineGrad;
      ctx.fillRect(0, CEILING_SURFACE_Y - 4, PLAYGROUND_WIDTH, 4);

      // Floor
      const floorTop = FLOOR_SURFACE_Y;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, floorTop, PLAYGROUND_WIDTH, PLAYGROUND_HEIGHT - floorTop);

      ctx.shadowColor = roomTheme.accent;
      ctx.shadowBlur = 12;
      ctx.fillStyle = ceilLineGrad;
      ctx.fillRect(0, floorTop, PLAYGROUND_WIDTH, 4);
      ctx.shadowBlur = 0;

      // Checkered floor across world
      const startFloorX = Math.floor(cameraX / 40) * 40;
      const endFloorX = Math.min(PLAYGROUND_WIDTH, cameraX + VIEWPORT_WIDTH + 40);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let fx = startFloorX; fx < endFloorX; fx += 40) {
        if (Math.floor(fx / 40) % 2 === 0) {
          ctx.fillRect(fx, floorTop + 4, 40, PLAYGROUND_HEIGHT - floorTop - 4);
        }
      }

      // Left & Right Neon Room Boundary Walls
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, CEILING_SURFACE_Y, 8, floorTop - CEILING_SURFACE_Y);
      ctx.fillRect(PLAYGROUND_WIDTH - 8, CEILING_SURFACE_Y, 8, floorTop - CEILING_SURFACE_Y);
      ctx.fillStyle = roomTheme.accent;
      ctx.fillRect(6, CEILING_SURFACE_Y, 3, floorTop - CEILING_SURFACE_Y);
      ctx.fillRect(PLAYGROUND_WIDTH - 9, CEILING_SURFACE_Y, 3, floorTop - CEILING_SURFACE_Y);

      // 3. Room-Specific Obstacles & Platforms
      for (const obs of roomObstacles) {
        if (obs.x + obs.w < cameraX - 40 || obs.x > cameraX + VIEWPORT_WIDTH + 40) {
          continue;
        }

        ctx.fillStyle = '#0c1322';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        ctx.shadowColor = roomTheme.accent;
        ctx.shadowBlur = 8;
        ctx.fillStyle = roomTheme.accent;
        ctx.fillRect(obs.x, obs.y, obs.w, 3.5);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = roomTheme.border;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        ctx.save();
        ctx.beginPath();
        ctx.rect(obs.x, obs.y, obs.w, obs.h);
        ctx.clip();
        ctx.fillStyle = roomTheme.stripe;
        for (let ox = obs.x - 16; ox < obs.x + obs.w + 16; ox += 24) {
          ctx.beginPath();
          ctx.moveTo(ox, obs.y + obs.h);
          ctx.lineTo(ox + 12, obs.y + 4);
          ctx.lineTo(ox + 20, obs.y + 4);
          ctx.lineTo(ox + 8, obs.y + obs.h);
          ctx.fill();
        }
        ctx.restore();
      }

      // 4. Click Ripples in World Coordinates
      const validRipples: ClickRipple[] = [];
      for (const r of ripplesRef.current) {
        const age = clientNow - r.createdAt;
        if (age >= 0 && age < 450) {
          validRipples.push(r);
          const p = age / 450;
          ctx.beginPath();
          ctx.arc(r.x, r.y, p * 35, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${1 - p})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      ripplesRef.current = validRipples;

      // 5. Draw Players
      for (const { player, physics, currentMode, drawX, drawY } of evaluatedPlayers) {
        // Wave Trail
        if (currentMode === 'wave') {
          let trail = waveTrailsRef.current.get(player.userId);
          if (!trail) {
            trail = [];
            waveTrailsRef.current.set(player.userId, trail);
          }
          trail.push({ x: drawX, y: drawY, t: clientNow });
          trail = trail.filter((pt) => clientNow - pt.t < 350);
          waveTrailsRef.current.set(player.userId, trail);

          if (trail.length > 1) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
              ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.strokeStyle =
              player.isActiveInRoom && !player.isAfk
                ? 'rgba(56, 189, 248, 0.78)'
                : 'rgba(56, 189, 248, 0.32)';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.restore();
          }
        }

        // Cull off-screen icons cleanly (keep trails updated above)
        if (drawX < cameraX - 120 || drawX > cameraX + VIEWPORT_WIDTH + 120) {
          continue;
        }

        const isFullyActive = player.isActiveInRoom && !player.isAfk;
        const baseAlpha = isFullyActive ? 1.0 : 0.38;

        let scalePunch = 1.0;

        // Despawn / Vanish Animation (260ms implosion)
        const despawnAge = player.despawnedAt ? clientNow - player.despawnedAt : 0;
        if (player.despawnedAt) {
          if (despawnAge >= 260) {
            continue;
          }
          const dp = clamp(despawnAge / 260, 0, 1);
          ctx.save();
          ctx.beginPath();
          ctx.arc(drawX, drawY, (1 - dp) * 50, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${1 - dp})`;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
          scalePunch = Math.max(0, 1.0 - dp);
        }

        // Dramatic Fast Spawn Animation (260ms)
        const spawnAge = player.spawnedAt ? clientNow - player.spawnedAt : 9999;
        if (!player.despawnedAt && spawnAge >= 0 && spawnAge < 260) {
          if (spawnAge < 70) {
            lastShakeTimeRef.current = clientNow;
            ctx.save();
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 24;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(drawX, 0);
            ctx.lineTo(drawX, drawY);
            ctx.stroke();
            ctx.restore();
          }

          const burstP = clamp((spawnAge - 70) / 190, 0, 1);
          ctx.save();
          ctx.beginPath();
          ctx.arc(drawX, drawY, burstP * 65, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${1 - burstP})`;
          ctx.lineWidth = 3.5;
          ctx.stroke();
          ctx.restore();

          scalePunch = 1.0 + Math.sin(burstP * Math.PI) * 0.35;
        }

        ctx.save();
        ctx.globalAlpha = baseAlpha;
        ctx.translate(drawX, drawY);

        ctx.rotate((physics.rotation * Math.PI) / 180);
        ctx.scale(physics.scaleX * scalePunch, (physics.flipY ? -1 : 1) * scalePunch);

        const iconUrl = getIconUrl(player, currentMode);
        const img = getImage(iconUrl);
        const drawH = VEHICLE_HEIGHTS[currentMode] || 42;

        // 1. CUBE RIDER ON LOWER LAYER (Jetpack & UFO)
        if (currentMode === 'jetpack' || currentMode === 'ufo') {
          const cubeUrl = getIconUrl(player, 'cube');
          const cubeImg = getImage(cubeUrl);
          if (cubeImg) {
            let cubeSize = 24;
            let offsetX = 0;
            let offsetY = 0;

            if (currentMode === 'jetpack') {
              cubeSize = 24;
              offsetX = 6;
              offsetY = -6;
            } else if (currentMode === 'ufo') {
              cubeSize = 20;
              offsetX = 0;
              offsetY = -5;
            }

            ctx.drawImage(
              cubeImg,
              offsetX - cubeSize / 2,
              offsetY - cubeSize / 2,
              cubeSize,
              cubeSize
            );
          }
        }

        // 2. MAIN GAMEMODE SPRITE ON TOP (higher layer)
        if (img) {
          const nw = img.naturalWidth || 100;
          const nh = img.naturalHeight || 100;
          const aspect = nw / nh;
          const drawW = Math.round(drawH * aspect);
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
          ctx.fillStyle = player.nameColor || '#38bdf8';
          ctx.fillRect(-20, -20, 40, 40);
        }

        ctx.restore();

        // Nameplate
        ctx.save();
        ctx.globalAlpha = baseAlpha;
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = physics.flipY ? 'top' : 'bottom';

        const nameY = physics.flipY
          ? drawY + PLAYER_RADIUS + 8
          : drawY - PLAYER_RADIUS - 8;
        const displayName = (player.clan?.tag ? `[${player.clan.tag}] ` : '') + player.displayName;

        ctx.fillStyle = '#000000';
        ctx.fillText(displayName, drawX + 1, nameY + 1);

        if (player.nameColor) {
          ctx.fillStyle = player.nameColor;
        } else if (player.isSupporter) {
          ctx.fillStyle = '#f472b6';
        } else {
          ctx.fillStyle = '#e2e8f0';
        }
        ctx.fillText(displayName, drawX, nameY);

        const badgeY = physics.flipY ? nameY + 14 : nameY - 14;
        if (player.isAfk) {
          ctx.font = '700 10px system-ui, sans-serif';
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('💤 Idle', drawX, badgeY);
        } else if (!player.isActiveInRoom) {
          ctx.font = '500 10px system-ui, sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('Idle', drawX, badgeY);
        } else if (player.userId === curUserId) {
          ctx.font = '700 10px system-ui, sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('▲', drawX, badgeY);
        }

        ctx.restore();
      }

      // 6. Speech Bubbles in World Coordinates
      deleteBtnBoundsRef.current.clear();

      const activeChats = curChats
        .filter((c) => c.expiresAt > now)
        .sort((a, b) => a.createdAt - b.createdAt);

      for (const chat of activeChats) {
        const pos = playerPositions.get(chat.userId);
        if (!pos) continue;

        const timeLeft = chat.expiresAt - now;
        const fadeAlpha = timeLeft < 400 ? timeLeft / 400 : 1.0;

        ctx.save();
        ctx.globalAlpha = Math.max(0, fadeAlpha);

        ctx.font = '500 13px system-ui, sans-serif';
        const textMetrics = ctx.measureText(chat.text);
        const paddingX = 14;
        const bubbleW = textMetrics.width + paddingX * 2 + (curIsStaff ? 20 : 0);
        const bubbleH = 32;

        let bx = pos.x - bubbleW / 2;
        let by = pos.y - PLAYER_RADIUS - 36 - bubbleH;

        let flipped = false;
        if (by < CEILING_SURFACE_Y + 10) {
          by = pos.y + PLAYER_RADIUS + 12;
          flipped = true;
        }

        bx = clamp(bx, 20, PLAYGROUND_WIDTH - bubbleW - 20);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = chat.userId === curUserId ? '#38bdf8' : 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(bx, by, bubbleW, bubbleH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        const tipX = clamp(pos.x, bx + 10, bx + bubbleW - 10);
        if (!flipped) {
          ctx.moveTo(tipX - 6, by + bubbleH);
          ctx.lineTo(tipX, by + bubbleH + 7);
          ctx.lineTo(tipX + 6, by + bubbleH);
        } else {
          ctx.moveTo(tipX - 6, by);
          ctx.lineTo(tipX, by - 7);
          ctx.lineTo(tipX + 6, by);
        }
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(chat.text, bx + paddingX, by + bubbleH / 2);

        if (curIsStaff && curOnDeleteChat) {
          const btnX = bx + bubbleW - 20;
          const btnY = by + 6;
          deleteBtnBoundsRef.current.set(chat.id, {
            x: btnX - 2,
            y: btnY - 2,
            w: 20,
            h: 20,
          });

          ctx.fillStyle = '#ef4444';
          ctx.font = '700 12px monospace';
          ctx.fillText('×', btnX, by + bubbleH / 2);
        }

        ctx.restore();
      }

      ctx.restore(); // End world-space camera translation

      // 7. Minimalist Viewport Scroll Position Bar (zero text, subtle 3px neon track at bottom)
      if (maxCameraX > 0) {
        const trackW = 180;
        const trackH = 3;
        const trackX = (VIEWPORT_WIDTH - trackW) / 2;
        const trackY = VIEWPORT_HEIGHT - 10;
        const thumbW = Math.round(trackW * (VIEWPORT_WIDTH / PLAYGROUND_WIDTH));
        const thumbX =
          trackX + Math.round((cameraX / maxCameraX) * (trackW - thumbW));

        ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.beginPath();
        ctx.roundRect(trackX, trackY, trackW, trackH, 2);
        ctx.fill();

        ctx.fillStyle = roomTheme.accent;
        ctx.beginPath();
        ctx.roundRect(thumbX, trackY, thumbW, trackH, 2);
        ctx.fill();
      }

      ctx.restore(); // restore shake

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-slate-950 select-none">
      <canvas
        ref={canvasRef}
        width={VIEWPORT_WIDTH}
        height={VIEWPORT_HEIGHT}
        onClick={handleCanvasClick}
        className="w-full h-auto block cursor-crosshair touch-none"
        style={{ aspectRatio: `${VIEWPORT_WIDTH} / ${VIEWPORT_HEIGHT}` }}
      />
    </div>
  );
};
