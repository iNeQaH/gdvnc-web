export type Gamemode =
  | 'cube'
  | 'jetpack'
  | 'ball'
  | 'ufo'
  | 'wave'
  | 'swing';

export function normalizeGamemode(mode?: string | null): Gamemode {
  switch (mode) {
    case 'cube':
    case 'jetpack':
    case 'ball':
    case 'ufo':
    case 'wave':
    case 'swing':
      return mode;
    case 'ship':
      return 'jetpack';
    default:
      return 'cube';
  }
}

// Viewport box dimensions (inside the canvas frame) vs scrollable world width
export const VIEWPORT_WIDTH = 1600;
export const VIEWPORT_HEIGHT = 620;
export const PLAYGROUND_WIDTH = 2800; // 1.75x viewport: smooth left/right scrolling without being overly long
export const PLAYGROUND_HEIGHT = 620;

// GD 2.2 Platformer push-zone ratios inside viewport (32% left / 68% right)
export const CAMERA_LEFT_PUSH_RATIO = 0.32;
export const CAMERA_RIGHT_PUSH_RATIO = 0.68;

// Authentic GD Surface levels (using bottom of player feet as reference)
export const FLOOR_SURFACE_Y = 554; // Floor neon top edge
export const CEILING_SURFACE_Y = 58; // Ceiling neon bottom edge
export const PLAYER_RADIUS = 21; // Vertical half-size of player hitbox (Cube is 42x42)
export const SUPPORT_HALF_W = 18; // Unified horizontal half-width for surface & wall checks

export interface RoomObstacle {
  id: string;
  x: number;
  y: number; // Top edge of the obstacle
  w: number;
  h: number;
}

// Room 1 ("public-1") — Spacious Stepped Terraces & High Skyways (x: 0..2800)
// Designed with 180px-350px open floor zones and 160px+ vertical clearance so players NEVER get stuck!
export const ROOM_1_OBSTACLES: RoomObstacle[] = [
  // West Cluster (x: 260..700)
  { id: 'r1-step-w1', x: 260, y: 486, w: 120, h: 68 },
  { id: 'r1-plat-w1', x: 470, y: 356, w: 230, h: 32 },

  // Mid-West Cluster (x: 980..1520) - Open floor run 700..980 (280px free)
  { id: 'r1-step-m1', x: 980, y: 486, w: 120, h: 68 },
  { id: 'r1-plat-m1', x: 1180, y: 350, w: 240, h: 32 },
  { id: 'r1-sky-m2', x: 1320, y: 218, w: 200, h: 30 },

  // Mid-East Cluster (x: 1780..2320) - Open floor run 1520..1780 (260px free)
  { id: 'r1-step-e1', x: 1780, y: 486, w: 120, h: 68 },
  { id: 'r1-plat-e1', x: 1980, y: 350, w: 240, h: 32 },
  { id: 'r1-sky-e2', x: 2120, y: 218, w: 200, h: 30 },

  // East Outpost (x: 2540..2680) - Open floor run 2320..2540 (220px free)
  { id: 'r1-step-e2', x: 2540, y: 486, w: 140, h: 68 },
];

// Room 2 ("public-2") — Twin Peaks, Open Skyway & Staggered Pyramid (x: 0..2800)
// No alcoves or low overhangs under the skyway; completely clear ground corridor!
export const ROOM_2_OBSTACLES: RoomObstacle[] = [
  // West Steps (x: 240..660)
  { id: 'r2-step-w1', x: 240, y: 486, w: 120, h: 68 },
  { id: 'r2-plat-w1', x: 440, y: 360, w: 220, h: 32 },

  // Center Grand Skyway (x: 940..1360) - completely free floor beneath (y: 336, clearance 184px!)
  { id: 'r2-skyway', x: 940, y: 336, w: 420, h: 34 },

  // Staggered Pyramid Parkour Steps (x: 1580..2660) - 100px+ horizontal spacing between tiers
  { id: 'r2-step-1', x: 1580, y: 486, w: 120, h: 68 },
  { id: 'r2-tier-2', x: 1780, y: 390, w: 160, h: 32 },
  { id: 'r2-tier-3', x: 2020, y: 290, w: 190, h: 32 },
  { id: 'r2-tier-4', x: 2300, y: 390, w: 160, h: 32 },
  { id: 'r2-step-5', x: 2540, y: 486, w: 120, h: 68 },
];

// Clan Room ("clan-*") — Grand Open Fortress Arena (x: 0..2800)
// Perfectly symmetrical and fully unobstructed under-throne corridor
export const CLAN_ROOM_OBSTACLES: RoomObstacle[] = [
  // West Wing
  { id: 'cl-step-w', x: 240, y: 486, w: 120, h: 68 },
  { id: 'cl-plat-w', x: 440, y: 360, w: 210, h: 32 },
  { id: 'cl-tower-w', x: 740, y: 250, w: 180, h: 32 },
  { id: 'cl-inner-w', x: 1000, y: 486, w: 120, h: 68 },

  // Central Grand Throne (high clearance: y 326, clearance 194px from floor)
  { id: 'cl-throne-high', x: 1200, y: 326, w: 400, h: 34 },

  // East Wing (symmetrical mirror)
  { id: 'cl-inner-e', x: 1680, y: 486, w: 120, h: 68 },
  { id: 'cl-tower-e', x: 1880, y: 250, w: 180, h: 32 },
  { id: 'cl-plat-e', x: 2150, y: 360, w: 210, h: 32 },
  { id: 'cl-step-e', x: 2440, y: 486, w: 120, h: 68 },
];

export const ROOM_OBSTACLES = ROOM_1_OBSTACLES;

export function getRoomLayoutKey(roomId?: string | null): 'r1' | 'r2' | 'clan' {
  if (!roomId || roomId === 'public-1') return 'r1';
  if (roomId === 'public-2') return 'r2';
  if (roomId.startsWith('clan-')) return 'clan';
  return 'r1';
}

export function getRoomObstacles(roomId?: string | null): RoomObstacle[] {
  const key = getRoomLayoutKey(roomId);
  if (key === 'r2') return ROOM_2_OBSTACLES;
  if (key === 'clan') return CLAN_ROOM_OBSTACLES;
  return ROOM_1_OBSTACLES;
}

export interface PlayerPhysicsState {
  x: number;
  y: number;
  vy: number;
  isOnGround: boolean;
  rotation: number;
  flipY: boolean;
  scaleX: number;
}

export interface PlaygroundSegment {
  id?: string;
  roomId?: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number; // in ms
  mode: Gamemode;
  seed: number;
  direction: 1 | -1;
  hopCount?: number; // >0 for jumping/hopping in place without horizontal travel
  // Starting momentum for seamless chained clicks without mid-air double-jumps or snaps
  startVy?: number;
  startOnGround?: boolean;
  startRotation?: number;
  startFlipY?: boolean;
}

export interface PhysicsResult extends PlayerPhysicsState {
  isFinished: boolean;
  progress: number;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Checks if a player at (x, feetY) is resting on the floor or on top of any platform in `roomId`.
 */
export function getSupportingSurface(
  x: number,
  feetY: number,
  tolerance = 3.0,
  roomId?: string | null
): number | null {
  const obstacles = getRoomObstacles(roomId);
  for (const obs of obstacles) {
    if (x + SUPPORT_HALF_W > obs.x + 0.5 && x - SUPPORT_HALF_W < obs.x + obs.w - 0.5) {
      if (Math.abs(feetY - obs.y) <= tolerance) {
        return obs.y;
      }
    }
  }
  if (Math.abs(feetY - FLOOR_SURFACE_Y) <= tolerance || feetY >= FLOOR_SURFACE_Y) {
    return FLOOR_SURFACE_Y;
  }
  return null;
}

/**
 * Checks if an inverted Ball at (x, headY) is resting against the ceiling or a platform underside.
 */
export function getSupportingCeiling(
  x: number,
  headY: number,
  tolerance = 3.0,
  roomId?: string | null
): number | null {
  const obstacles = getRoomObstacles(roomId);
  for (const obs of obstacles) {
    if (x + SUPPORT_HALF_W > obs.x + 0.5 && x - SUPPORT_HALF_W < obs.x + obs.w - 0.5) {
      const bottom = obs.y + obs.h;
      if (Math.abs(headY - bottom) <= tolerance) {
        return bottom;
      }
    }
  }
  if (Math.abs(headY - CEILING_SURFACE_Y) <= tolerance || headY <= CEILING_SURFACE_Y) {
    return CEILING_SURFACE_Y;
  }
  return null;
}

/**
 * Finds the top surface at x that is at or below feetY.
 */
export function getSurfaceBelow(x: number, feetY: number, roomId?: string | null): number {
  const obstacles = getRoomObstacles(roomId);
  let bestY = FLOOR_SURFACE_Y;
  for (const obs of obstacles) {
    if (x + SUPPORT_HALF_W > obs.x + 0.5 && x - SUPPORT_HALF_W < obs.x + obs.w - 0.5) {
      if (obs.y >= feetY - 4 && obs.y < bestY) {
        bestY = obs.y;
      }
    }
  }
  return bestY;
}

/**
 * Finds the ceiling or platform underside at x that is at or above headY.
 */
export function getSurfaceAbove(x: number, headY: number, roomId?: string | null): number {
  const obstacles = getRoomObstacles(roomId);
  let bestY = CEILING_SURFACE_Y;
  for (const obs of obstacles) {
    if (x + SUPPORT_HALF_W > obs.x + 0.5 && x - SUPPORT_HALF_W < obs.x + obs.w - 0.5) {
      const bottom = obs.y + obs.h;
      if (bottom <= headY + 4 && bottom > bestY) {
        bestY = bottom;
      }
    }
  }
  return bestY;
}

/**
 * Finds the optimal surface top at x considering targetY.
 */
export function getSurfaceAtX(x: number, targetY?: number, roomId?: string | null): number {
  if (targetY === undefined) {
    return getSurfaceBelow(x, 0, roomId);
  }
  const obstacles = getRoomObstacles(roomId);
  const refFeet = targetY + PLAYER_RADIUS;
  let bestY = FLOOR_SURFACE_Y;
  let minDiff = Math.abs(refFeet - FLOOR_SURFACE_Y);

  for (const obs of obstacles) {
    if (x + SUPPORT_HALF_W > obs.x + 0.5 && x - SUPPORT_HALF_W < obs.x + obs.w - 0.5) {
      const diff = Math.abs(refFeet - obs.y);
      if (diff < minDiff) {
        minDiff = diff;
        bestY = obs.y;
      }
    }
  }
  return bestY;
}

/**
 * Detects if there is an obstacle blocking horizontal movement in front of the player.
 */
export function findObstacleAhead(
  currentX: number,
  currentFeetY: number,
  direction: 1 | -1,
  lookAheadDist = 62,
  roomId?: string | null
): RoomObstacle | null {
  const obstacles = getRoomObstacles(roomId);
  for (const obs of obstacles) {
    const wallX = direction > 0 ? obs.x : obs.x + obs.w;
    const distToWall =
      direction > 0
        ? wallX - (currentX + SUPPORT_HALF_W)
        : currentX - SUPPORT_HALF_W - wallX;

    if (distToWall >= -2 && distToWall <= lookAheadDist) {
      if (obs.y < currentFeetY - 4 && obs.y + obs.h > currentFeetY - PLAYER_RADIUS * 2 + 2) {
        return obs;
      }
    }
  }
  return null;
}

/**
 * Authentic 240Hz Physics constants extracted from Geometry Dash 2.2 PlayerObject
 */
const GD_1X_HORIZONTAL_SPEED = 436.2; // px/s
const GD_TICK_DT = 1 / 240; // 240Hz physics tick

const GD_GRAVITY_CUBE = 0.958199 * 1.4 * 60 * 60; // 4829.3 px/s^2
const GD_JUMP_IMPULSE_CUBE = 11.180032 * 1.4 * 60; // 939.1 px/s (91.3px jump height)
const GD_TERMINAL_VELOCITY = 15.0 * 1.4 * 60; // 1260 px/s downward cap

interface TrajectoryPoint {
  t: number; // in seconds from segment start
  x: number;
  y: number; // center Y
  vy: number;
  isOnGround: boolean;
  rotation: number;
  flipY: boolean;
  scaleX: number;
}

const trajectoryCache = new Map<string, { points: TrajectoryPoint[]; totalDuration: number }>();
const MAX_TRAJECTORY_CACHE = 600;

/**
 * Simulates authentic GD 2.2 fixed-timestep trajectory for a movement segment.
 * Guarantees zero t=0 snap/teleport: initial frame always starts at (segment.fromX, segment.fromY).
 */
function simulateTrajectory(segment: PlaygroundSegment): { points: TrajectoryPoint[]; totalDuration: number } {
  const mode = normalizeGamemode(segment.mode);
  const layoutKey = getRoomLayoutKey(segment.roomId);
  const obstacles = getRoomObstacles(segment.roomId);
  const hopInit = segment.hopCount ?? 0;

  const cacheKey = `${layoutKey}_${segment.fromX.toFixed(2)}_${segment.fromY.toFixed(2)}_${segment.toX.toFixed(2)}_${segment.toY.toFixed(2)}_${mode}_${hopInit}_${(segment.startVy ?? 0).toFixed(1)}_${segment.startOnGround ?? 'u'}_${segment.startFlipY ? 1 : 0}_${(segment.startRotation ?? 0).toFixed(1)}_${segment.seed.toFixed(2)}`;
  const cached = trajectoryCache.get(cacheKey);
  if (cached) return cached;

  const points: TrajectoryPoint[] = [];

  let x = clamp(segment.fromX, 30, PLAYGROUND_WIDTH - 30);
  let y = clamp(segment.fromY, CEILING_SURFACE_Y + PLAYER_RADIUS, FLOOR_SURFACE_Y - PLAYER_RADIUS);
  let feetY = y + PLAYER_RADIUS;
  let headY = y - PLAYER_RADIUS;

  // Only Ball supports inverted ceiling-walk gravity
  let flipY = mode === 'ball' ? Boolean(segment.startFlipY) : false;
  let gravityDir: 1 | -1 = flipY ? -1 : 1;

  let vy = segment.startVy ?? 0;
  let rotation = segment.startRotation ?? 0;

  // Determine starting ground state strictly from actual proximity (NEVER snap across air!)
  let isOnGround = false;
  if (gravityDir === 1) {
    const surf = getSupportingSurface(x, feetY, 2.5, segment.roomId);
    if (surf !== null && vy <= 5) {
      isOnGround = true;
      if (Math.abs(feetY - surf) <= 1.0) {
        feetY = surf;
        y = feetY - PLAYER_RADIUS;
        headY = y - PLAYER_RADIUS;
      }
    }
  } else {
    const ceil = getSupportingCeiling(x, headY, 2.5, segment.roomId);
    if (ceil !== null && vy >= -5) {
      isOnGround = true;
      if (Math.abs(headY - ceil) <= 1.0) {
        headY = ceil;
        y = headY + PLAYER_RADIUS;
        feetY = y + PLAYER_RADIUS;
      }
    }
  }

  const targetX = clamp(segment.toX, 45, PLAYGROUND_WIDTH - 45);
  const targetY = clamp(segment.toY, CEILING_SURFACE_Y + PLAYER_RADIUS + 2, FLOOR_SURFACE_Y - PLAYER_RADIUS);
  const targetFeetY = targetY + PLAYER_RADIUS;
  const dir: 1 | -1 = Math.abs(targetX - x) < 0.5 ? segment.direction : targetX >= x ? 1 : -1;

  let t = 0;
  const maxSimulationTime = 7.5;
  const dt = GD_TICK_DT;

  let ufoCooldown = 0;
  let jumpCooldown = 0;
  let hopsRemaining = hopInit;
  let hopBoostTimer = 0;

  // Wave stochastic zigzag generator
  let waveHoldTimer = 0;
  let waveIsHolding = Math.floor(Math.abs(segment.seed)) % 2 === 0;

  // Track vertical ascent when target is significantly higher than start
  const isTargetHigher = targetY < segment.fromY - 8;
  let hasReachedTargetAltitude = !isTargetHigher;

  // Record exact initial frame (zero position jump at t=0)
  points.push({
    t: 0,
    x,
    y,
    vy,
    isOnGround,
    rotation,
    flipY,
    scaleX: dir,
  });

  while (t < maxSimulationTime) {
    t += dt;
    jumpCooldown -= dt;
    if (hopBoostTimer > 0) hopBoostTimer -= dt;

    const distRemaining = Math.abs(targetX - x);
    const reachedTargetX = distRemaining < 2.5;

    // Check if vertical target altitude reached for climbing flights
    if (isTargetHigher && !hasReachedTargetAltitude) {
      if (y <= targetY + 6 || headY <= CEILING_SURFACE_Y + 1) {
        hasReachedTargetAltitude = true;
      }
    }
    const isFlightActive = !reachedTargetX || (isTargetHigher && !hasReachedTargetAltitude);

    // 1. HORIZONTAL VELOCITY
    let vx = 0;
    if (!reachedTargetX) {
      vx = dir * Math.min(GD_1X_HORIZONTAL_SPEED, distRemaining / dt);
    }

    // Check if an obstacle is blocking horizontal path
    const obstacleAhead = !reachedTargetX
      ? findObstacleAhead(x, feetY, dir, 62, segment.roomId)
      : null;
    const isTargetElevated =
      !reachedTargetX &&
      targetFeetY < feetY - 24 &&
      targetFeetY >= feetY - 96 &&
      distRemaining <= 72;

    // 2. MODE-SPECIFIC VERTICAL PHYSICS
    switch (mode) {
      case 'cube': {
        if (isOnGround) {
          vy = 0;
          rotation = Math.round(rotation / 90) * 90;

          if (jumpCooldown <= 0 && (obstacleAhead || isTargetElevated || hopsRemaining > 0)) {
            if (hopsRemaining > 0 && !obstacleAhead && !isTargetElevated) {
              hopsRemaining--;
            }
            isOnGround = false;
            vy = GD_JUMP_IMPULSE_CUBE;
            jumpCooldown = 0.41;
          }
        }

        if (!isOnGround) {
          vy -= GD_GRAVITY_CUBE * dt;
          if (vy < -GD_TERMINAL_VELOCITY) vy = -GD_TERMINAL_VELOCITY;
          rotation += 415 * dt * dir;
        }
        break;
      }

      case 'jetpack': {
        if (reachedTargetX && hopsRemaining > 0 && hopBoostTimer <= 0 && (isOnGround || vy <= 0)) {
          hopsRemaining--;
          hopBoostTimer = 0.24;
          isOnGround = false;
        }

        if (isFlightActive || hopBoostTimer > 0) {
          const needsThrust =
            hopBoostTimer > 0 ||
            (obstacleAhead && y + PLAYER_RADIUS > obstacleAhead.y - 14) ||
            y > targetY + 4;

          if (needsThrust) {
            isOnGround = false;
            vy += 2850 * dt;
          } else {
            vy -= 2450 * dt;
          }
          vy = clamp(vy, -GD_TERMINAL_VELOCITY * 0.62, GD_TERMINAL_VELOCITY * 0.72);
          rotation = clamp((-vy / 44) * dir, -13, 13);
        } else {
          vy -= GD_GRAVITY_CUBE * 0.72 * dt;
          if (vy < -GD_TERMINAL_VELOCITY * 0.62) vy = -GD_TERMINAL_VELOCITY * 0.62;
          rotation = rotation * 0.88;
        }
        break;
      }

      case 'ufo': {
        ufoCooldown -= dt;
        if (isFlightActive || hopsRemaining > 0) {
          const needsFlap =
            hopsRemaining > 0 ||
            (obstacleAhead && y + PLAYER_RADIUS > obstacleAhead.y - 10) ||
            y > targetY + 8;
          if (needsFlap && ufoCooldown <= 0) {
            if (reachedTargetX && hopsRemaining > 0) hopsRemaining--;
            isOnGround = false;
            vy = 560;
            ufoCooldown = 0.24;
          }
          vy -= GD_GRAVITY_CUBE * 0.6 * dt;
          if (vy < -GD_TERMINAL_VELOCITY * 0.6) vy = -GD_TERMINAL_VELOCITY * 0.6;
          rotation = clamp((-vy / 50) * dir, -14, 14);
        } else {
          vy -= GD_GRAVITY_CUBE * 0.65 * dt;
          if (vy < -GD_TERMINAL_VELOCITY * 0.6) vy = -GD_TERMINAL_VELOCITY * 0.6;
          rotation = rotation * 0.88;
        }
        break;
      }

      case 'wave': {
        if (reachedTargetX && hopsRemaining > 0 && hopBoostTimer <= 0 && (isOnGround || vy <= 0)) {
          hopsRemaining--;
          hopBoostTimer = 0.18;
          isOnGround = false;
        }

        if (isFlightActive || hopBoostTimer > 0) {
          if (hopBoostTimer > 0 || (isTargetHigher && !hasReachedTargetAltitude)) {
            waveIsHolding = true;
          } else {
            waveHoldTimer -= dt;
            if (waveHoldTimer <= 0) {
              waveIsHolding = !waveIsHolding;
              const randFactor = (Math.sin(t * 13 + segment.seed) + 1) / 2;
              waveHoldTimer = 0.14 + randFactor * 0.16;
            }
          }

          if (
            (obstacleAhead && y + PLAYER_RADIUS > obstacleAhead.y - 8) ||
            y > FLOOR_SURFACE_Y - PLAYER_RADIUS - 10 ||
            (!hasReachedTargetAltitude && y > targetY + 6)
          ) {
            waveIsHolding = true;
          } else if (y < CEILING_SURFACE_Y + PLAYER_RADIUS + 10 || (isTargetHigher && y <= targetY)) {
            waveIsHolding = false;
          }

          if (waveIsHolding) isOnGround = false;
          vy = waveIsHolding ? GD_1X_HORIZONTAL_SPEED : -GD_1X_HORIZONTAL_SPEED;
          rotation = (waveIsHolding ? -45 : 45) * dir;
        } else {
          vy = -GD_1X_HORIZONTAL_SPEED;
          rotation = isOnGround ? 0 : 45 * dir;
        }
        break;
      }

      case 'ball': {
        if (isOnGround) {
          vy = 0;
          if (!reachedTargetX) {
            rotation += 620 * dt * dir * gravityDir;
          }

          const shouldFlip =
            jumpCooldown <= 0 &&
            (hopsRemaining > 0 ||
              (!reachedTargetX &&
                (Boolean(obstacleAhead) ||
                  (gravityDir === 1 && targetY < y - 45) ||
                  (gravityDir === -1 && targetY > y + 45))));

          if (shouldFlip) {
            if (hopsRemaining > 0) hopsRemaining--;
            isOnGround = false;
            gravityDir = gravityDir === 1 ? -1 : 1;
            flipY = gravityDir === -1;
            jumpCooldown = 0.45;
          }
        }

        if (!isOnGround) {
          vy -= GD_GRAVITY_CUBE * 0.75 * dt * gravityDir;
          if (Math.abs(vy) > GD_TERMINAL_VELOCITY) {
            vy = Math.sign(vy) * GD_TERMINAL_VELOCITY;
          }
          rotation += 620 * dt * dir * gravityDir;
        }
        break;
      }

      case 'swing': {
        if (reachedTargetX && hopsRemaining > 0 && hopBoostTimer <= 0 && (isOnGround || vy <= 0)) {
          hopsRemaining--;
          hopBoostTimer = 0.24;
          isOnGround = false;
        }

        if (isFlightActive || hopBoostTimer > 0) {
          isOnGround = false;
          if (hopBoostTimer > 0) {
            vy = 390;
          } else if (obstacleAhead && y + PLAYER_RADIUS > obstacleAhead.y - 12) {
            vy = 360;
          } else if (isTargetHigher && !hasReachedTargetAltitude) {
            vy = 380;
          } else {
            const centerBias = clamp((y - targetY) * 2.2, -240, 240);
            const swingPhase = Math.sin(t * Math.PI * 3 + segment.seed);
            vy = swingPhase * 340 + centerBias;
          }
          rotation = clamp((-vy / 18) * dir, -22, 22);
        } else {
          vy -= GD_GRAVITY_CUBE * 0.65 * dt;
          if (vy < -GD_TERMINAL_VELOCITY * 0.6) vy = -GD_TERMINAL_VELOCITY * 0.6;
          rotation = rotation * 0.9;
        }
        break;
      }
    }

    // 3. SEPARATING-AXIS SWEPT AABB COLLISION RESOLUTION
    // Pass 3A: Horizontal movement & side-wall collision (never snaps Y!)
    const prevX = x;
    x = clamp(x + vx * dt, 30, PLAYGROUND_WIDTH - 30);

    const bodyTop = y - PLAYER_RADIUS;
    const bodyBot = y + PLAYER_RADIUS;
    for (const obs of obstacles) {
      const obsRight = obs.x + obs.w;
      const obsBottom = obs.y + obs.h;
      if (bodyBot > obs.y + 2.5 && bodyTop < obsBottom - 2.5) {
        if (vx > 0 && prevX + SUPPORT_HALF_W <= obs.x + 0.5 && x + SUPPORT_HALF_W > obs.x) {
          x = obs.x - SUPPORT_HALF_W;
        } else if (
          vx < 0 &&
          prevX - SUPPORT_HALF_W >= obsRight - 0.5 &&
          x - SUPPORT_HALF_W < obsRight
        ) {
          x = obsRight + SUPPORT_HALF_W;
        }
      }
    }

    // Pass 3B: Vertical movement & floor / ceiling / platform resolution
    const prevY = y;
    const prevFeetY = prevY + PLAYER_RADIUS;
    const prevHeadY = prevY - PLAYER_RADIUS;

    y -= vy * dt;
    feetY = y + PLAYER_RADIUS;
    headY = y - PLAYER_RADIUS;

    let groundedOnThisStep = false;

    // Ceiling collision
    if (headY <= CEILING_SURFACE_Y) {
      headY = CEILING_SURFACE_Y;
      y = headY + PLAYER_RADIUS;
      feetY = y + PLAYER_RADIUS;
      if (gravityDir === -1) {
        vy = 0;
        isOnGround = true;
        groundedOnThisStep = true;
      } else if (vy > 0) {
        vy = 0;
      }
    }

    // Platform top & underside collision
    for (const obs of obstacles) {
      const obsRight = obs.x + obs.w;
      const obsBottom = obs.y + obs.h;

      if (x + SUPPORT_HALF_W > obs.x + 0.5 && x - SUPPORT_HALF_W < obsRight - 0.5) {
        if (gravityDir === 1 && vy <= 0 && prevFeetY <= obs.y + 2.5 && feetY >= obs.y) {
          feetY = obs.y;
          y = feetY - PLAYER_RADIUS;
          headY = y - PLAYER_RADIUS;
          vy = 0;
          groundedOnThisStep = true;
          isOnGround = true;
          break;
        }

        if (gravityDir === -1 && vy >= 0 && prevHeadY >= obsBottom - 2.5 && headY <= obsBottom) {
          headY = obsBottom;
          y = headY + PLAYER_RADIUS;
          feetY = y + PLAYER_RADIUS;
          vy = 0;
          groundedOnThisStep = true;
          isOnGround = true;
          break;
        }

        if (gravityDir === 1 && vy > 0 && prevHeadY >= obsBottom - 2.5 && headY < obsBottom) {
          headY = obsBottom;
          y = headY + PLAYER_RADIUS;
          feetY = y + PLAYER_RADIUS;
          vy = 0;
        }

        if (gravityDir === -1 && vy < 0 && prevFeetY <= obs.y + 2.5 && feetY > obs.y) {
          feetY = obs.y;
          y = feetY - PLAYER_RADIUS;
          headY = y - PLAYER_RADIUS;
          vy = 0;
        }
      }
    }

    // Main Floor collision
    if (feetY >= FLOOR_SURFACE_Y) {
      feetY = FLOOR_SURFACE_Y;
      y = FLOOR_SURFACE_Y - PLAYER_RADIUS;
      headY = y - PLAYER_RADIUS;
      if (gravityDir === 1) {
        vy = 0;
        groundedOnThisStep = true;
        isOnGround = true;
      } else if (vy < 0) {
        vy = 0;
      }
    }

    // Walking off a ledge / platform edge
    if (!groundedOnThisStep) {
      if (gravityDir === 1 && vy <= 0) {
        const surface = getSupportingSurface(x, feetY, 2.5, segment.roomId);
        if (surface !== null) {
          feetY = surface;
          y = feetY - PLAYER_RADIUS;
          headY = y - PLAYER_RADIUS;
          vy = 0;
          isOnGround = true;
        } else {
          isOnGround = false;
        }
      } else if (gravityDir === -1 && vy >= 0) {
        const ceil = getSupportingCeiling(x, headY, 2.5, segment.roomId);
        if (ceil !== null) {
          headY = ceil;
          y = headY + PLAYER_RADIUS;
          feetY = y + PLAYER_RADIUS;
          vy = 0;
          isOnGround = true;
        } else {
          isOnGround = false;
        }
      } else {
        isOnGround = false;
      }
    }

    // Store frame at 120Hz subsampled rate
    if (points.length === 0 || t - points[points.length - 1].t >= 1 / 120) {
      points.push({
        t,
        x,
        y,
        vy,
        isOnGround,
        rotation,
        flipY,
        scaleX: dir,
      });
    }

    // Termination: reached target X & target altitude (if climbing), completed any in-place hops, and resting stably on surface
    if (
      reachedTargetX &&
      hasReachedTargetAltitude &&
      hopsRemaining <= 0 &&
      hopBoostTimer <= 0 &&
      isOnGround &&
      Math.abs(vy) < 5
    ) {
      const restRotation =
        mode === 'cube'
          ? Math.round(rotation / 90) * 90
          : mode === 'ball'
          ? rotation
          : 0;
      points.push({
        t: t + dt,
        x,
        y,
        vy: 0,
        isOnGround: true,
        rotation: restRotation,
        flipY,
        scaleX: dir,
      });
      break;
    }
  }

  const result = {
    points,
    totalDuration: Math.max(16, points[points.length - 1].t * 1000),
  };

  if (trajectoryCache.size >= MAX_TRAJECTORY_CACHE) {
    const firstKey = trajectoryCache.keys().next().value;
    if (firstKey) trajectoryCache.delete(firstKey);
  }
  trajectoryCache.set(cacheKey, result);

  return result;
}

/**
 * Returns authentic Geometry Dash 2.2 coordinates and orientation for a segment at time `now`.
 */
export function getPlaygroundPhysics(segment: PlaygroundSegment, now: number): PhysicsResult {
  const { points, totalDuration } = simulateTrajectory(segment);
  const elapsedSec = (now - segment.startTime) / 1000;
  const isFinished = elapsedSec * 1000 >= totalDuration;

  if (elapsedSec <= 0 || points.length <= 1) {
    const p0 = points[0];
    return {
      ...p0,
      isFinished: false,
      progress: 0,
    };
  }

  if (isFinished) {
    const pEnd = points[points.length - 1];
    return {
      ...pEnd,
      isFinished: true,
      progress: 1.0,
    };
  }

  let low = 0;
  let high = points.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (points[mid].t < elapsedSec) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const i1 = Math.min(points.length - 1, Math.max(1, low));
  const i0 = i1 - 1;
  const p0 = points[i0];
  const p1 = points[i1];

  const span = Math.max(0.0001, p1.t - p0.t);
  const alpha = clamp((elapsedSec - p0.t) / span, 0, 1);

  return {
    x: p0.x + (p1.x - p0.x) * alpha,
    y: p0.y + (p1.y - p0.y) * alpha,
    vy: p0.vy + (p1.vy - p0.vy) * alpha,
    isOnGround: alpha > 0.5 ? p1.isOnGround : p0.isOnGround,
    rotation: p0.rotation + (p1.rotation - p0.rotation) * alpha,
    flipY: p1.flipY,
    scaleX: p1.scaleX,
    isFinished: false,
    progress: clamp((elapsedSec * 1000) / totalDuration, 0, 1),
  };
}

/**
 * Creates a new deterministic segment from current state to a target position in `roomId`.
 */
export function createPlaygroundSegment(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  mode: Gamemode,
  now = Date.now(),
  seed = Math.random() * 1000,
  momentum?: {
    vy?: number;
    isOnGround?: boolean;
    rotation?: number;
    flipY?: boolean;
    direction?: 1 | -1;
    id?: string;
    roomId?: string;
    hopCount?: number;
  }
): PlaygroundSegment {
  const normMode = normalizeGamemode(mode);
  const roomId = momentum?.roomId || 'public-1';
  const boundedFromX = clamp(fromX, 30, PLAYGROUND_WIDTH - 30);
  const boundedFromY = clamp(
    fromY,
    CEILING_SURFACE_Y + PLAYER_RADIUS,
    FLOOR_SURFACE_Y - PLAYER_RADIUS
  );
  const boundedToX = clamp(toX, 45, PLAYGROUND_WIDTH - 45);

  // Detect natural click-above-head in place (ONLY for ground modes like cube/ball to hop)
  let hopCount = momentum?.hopCount ?? 0;
  if (
    momentum?.hopCount === undefined &&
    (normMode === 'cube' || normMode === 'ball') &&
    Math.abs(boundedToX - boundedFromX) < 26 &&
    toY < boundedFromY - 38
  ) {
    hopCount = 1;
  }

  let boundedToY = clamp(
    toY,
    CEILING_SURFACE_Y + PLAYER_RADIUS + 2,
    FLOOR_SURFACE_Y - PLAYER_RADIUS
  );
  if (normMode === 'cube') {
    const targetSurf = getSurfaceAtX(boundedToX, toY, roomId);
    boundedToY = targetSurf - PLAYER_RADIUS;
  }

  const dir: 1 | -1 =
    Math.abs(boundedToX - boundedFromX) < 0.5
      ? momentum?.direction ?? 1
      : boundedToX >= boundedFromX
      ? 1
      : -1;

  const segment: PlaygroundSegment = {
    id: momentum?.id,
    roomId,
    fromX: boundedFromX,
    fromY: boundedFromY,
    toX: boundedToX,
    toY: boundedToY,
    startTime: now,
    duration: 400,
    mode: normMode,
    seed,
    direction: dir,
    hopCount: hopCount > 0 ? hopCount : undefined,
    startVy: momentum?.vy,
    startOnGround: momentum?.isOnGround,
    startRotation: momentum?.rotation,
    startFlipY: normMode === 'ball' ? momentum?.flipY : false,
  };

  const { totalDuration } = simulateTrajectory(segment);
  segment.duration = Math.max(50, Math.ceil(totalDuration));

  return segment;
}

// ---------------------------------------------------------
// Playground Food Items & Scoring System
// ---------------------------------------------------------
export type PlaygroundFoodType = 'circle' | 'square' | 'triangle' | 'hexagon';

export interface PlaygroundFoodItem {
  id: string;
  type: PlaygroundFoodType;
  baseX: number;
  baseY: number;
  amplitudeX: number;
  amplitudeY: number;
  driftSpeedX: number;
  driftSpeedY: number;
  phaseX: number;
  phaseY: number;
  rotSpeed: number; // radians per second
  rotPhase: number;
  spawnedAt: number;
  value: number; // circle: 1, square: 3, triangle: -5, hexagon: 10
  radius: number;
}

export interface PlaygroundLeaderboardEntry {
  userId: string;
  username: string;
  displayName?: string | null;
  score: number;
  avatarUrl?: string | null;
}

export function getFoodPoints(type: PlaygroundFoodType): number {
  switch (type) {
    case 'circle':
      return 1;
    case 'square':
      return 3;
    case 'triangle':
      return -5;
    case 'hexagon':
      return 10;
  }
}

export function getFoodRadius(type: PlaygroundFoodType): number {
  switch (type) {
    case 'circle':
      return 14;
    case 'square':
      return 13;
    case 'triangle':
      return 15;
    case 'hexagon':
      return 16;
  }
}

export function getPlaygroundFoodTransform(
  food: PlaygroundFoodItem,
  now: number
): { x: number; y: number; rotation: number } {
  const dt = Math.max(0, (now - food.spawnedAt) / 1000);
  const x = food.baseX + food.amplitudeX * Math.sin(dt * food.driftSpeedX + food.phaseX);
  const y = food.baseY + food.amplitudeY * Math.cos(dt * food.driftSpeedY + food.phaseY);
  const rotation = food.rotPhase + dt * food.rotSpeed;
  return { x, y, rotation };
}
