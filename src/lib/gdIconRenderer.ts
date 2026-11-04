import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getGdColor } from './gdColors';

const POTENTIAL_ICON_DIRS = [
  process.env.GD_ICONS_PATH,
  'D:/Programs/Steam/steamapps/common/Geometry Dash/Resources/icons',
  '/var/www/gd-icons',
  path.join(process.cwd(), 'public/gd-icons'),
].filter(Boolean) as string[];

const POTENTIAL_RESOURCE_DIRS = [
  process.env.GD_RESOURCES_PATH,
  'D:/Programs/Steam/steamapps/common/Geometry Dash/Resources',
  '/var/www/gd-icons',
  path.join(process.cwd(), 'public/gd-icons'),
].filter(Boolean) as string[];

function findExistingFile(dirs: string[], relativeName: string): string | null {
  for (const dir of dirs) {
    const full = path.join(dir, relativeName);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

const GAMEMODE_PREFIXES: Record<string, string> = {
  cube: 'player_',
  ship: 'ship_',
  ball: 'player_ball_',
  ufo: 'bird_',
  wave: 'dart_',
  robot: 'robot_',
  spider: 'spider_',
  swing: 'swing_',
  jetpack: 'jetpack_',
};

interface FrameData {
  offset: [number, number];
  size: [number, number];
  sourceSize: [number, number];
  rect: [[number, number], [number, number]];
  rotated: boolean;
}

interface AnimSprite {
  texture: string;
  pos: [number, number];
  scale: [number, number];
  rot: number;
  flipped: [number, number];
  z: number;
}

// In-memory caches for fast sub-millisecond responses
const plistCache = new Map<string, Record<string, FrameData>>();
const animCache = new Map<string, AnimSprite[]>();
const renderedIconCache = new Map<string, Buffer>();
const MAX_RENDER_CACHE = 500;

function parsePlist(content: string): Record<string, FrameData> {
  const frames: Record<string, FrameData> = {};
  const frameRegex = /<key>([^<]+\.png)<\/key>\s*<dict>([\s\S]*?)<\/dict>/g;
  let match: RegExpExecArray | null;
  while ((match = frameRegex.exec(content)) !== null) {
    const name = match[1];
    const dict = match[2];
    const getVal = (key: string) => {
      const m = dict.match(new RegExp('<key>' + key + '<\\/key>\\s*<string>([^<]*)<\\/string>'));
      return m ? m[1] : '';
    };
    const getBool = (key: string) => {
      const m = dict.match(new RegExp('<key>' + key + '<\\/key>\\s*<(true|false)\\/>'));
      return m ? m[1] === 'true' : false;
    };
    const parseVec = (s: string): [number, number] => {
      if (!s) return [0, 0];
      const p = s.replace(/[{}]/g, '').split(',').map(Number);
      return [p[0] || 0, p[1] || 0];
    };
    const parseRect = (s: string): [[number, number], [number, number]] => {
      if (!s) return [[0, 0], [0, 0]];
      const p = s.replace(/[{}]/g, '').split(',').map(Number);
      return [[p[0] || 0, p[1] || 0], [p[2] || 0, p[3] || 0]];
    };

    frames[name] = {
      offset: parseVec(getVal('spriteOffset')),
      size: parseVec(getVal('spriteSize')),
      sourceSize: parseVec(getVal('spriteSourceSize')),
      rect: parseRect(getVal('textureRect')),
      rotated: getBool('textureRotated'),
    };
  }
  return frames;
}

function extractDict(content: string, key: string): string {
  const start = content.indexOf('<key>' + key + '</key>');
  if (start === -1) return '';
  const dictStart = content.indexOf('<dict>', start);
  if (dictStart === -1) return '';
  let depth = 0;
  let idx = dictStart;
  while (idx < content.length) {
    if (content.startsWith('<dict>', idx) || content.startsWith('<dict/>', idx)) {
      depth++;
      idx += 6;
    } else if (content.startsWith('</dict>', idx)) {
      depth--;
      idx += 7;
      if (depth === 0) return content.slice(dictStart, idx);
    } else {
      idx++;
    }
  }
  return '';
}

function parseAnimDesc(content: string, animKey: string): AnimSprite[] {
  const dict = extractDict(content, animKey);
  if (!dict) return [];
  const sprites: AnimSprite[] = [];
  const spriteBlocks = dict.match(/<key>sprite_\d+<\/key>\s*<dict>([\s\S]*?)<\/dict>/g) || [];
  for (const block of spriteBlocks) {
    const getVal = (key: string) => {
      const m = block.match(new RegExp('<key>' + key + '<\\/key>\\s*<string>([^<]+)<\\/string>'));
      return m ? m[1] : null;
    };
    const texture = getVal('texture');
    if (!texture) continue;
    const pos = (getVal('position') || '{0,0}').replace(/[{}]/g, '').split(',').map(Number) as [number, number];
    const scale = (getVal('scale') || '{1,1}').replace(/[{}]/g, '').split(',').map(Number) as [number, number];
    const rot = Number(getVal('rotation') || 0);
    const flipped = (getVal('flipped') || '{0,0}').replace(/[{}]/g, '').split(',').map(Number) as [number, number];
    const z = Number(getVal('zValue') || 0);
    sprites.push({ texture, pos, scale, rot, flipped, z });
  }
  return sprites.sort((a, b) => a.z - b.z);
}

function getPlistFrames(basename: string): Record<string, FrameData> | null {
  if (plistCache.has(basename)) return plistCache.get(basename)!;
  const plistPath = findExistingFile(POTENTIAL_ICON_DIRS, `${basename}-hd.plist`);
  if (!plistPath) return null;
  const content = fs.readFileSync(/*turbopackIgnore: true*/ plistPath, 'utf8');
  const frames = parsePlist(content);
  plistCache.set(basename, frames);
  return frames;
}

async function renderLayer(
  pngPath: string,
  frame: FrameData,
  color: [number, number, number] | null,
  scale: [number, number] = [1, 1],
  rotation = 0
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  const [x, y] = frame.rect[0];
  const [w, h] = frame.rect[1];
  const extractW = frame.rotated ? h : w;
  const extractH = frame.rotated ? w : h;

  if (extractW <= 0 || extractH <= 0) return null;

  // Extract from spritesheet first to isolate sprite before chaining transforms
  const cropped = await sharp(pngPath)
    .extract({ left: x, top: y, width: extractW, height: extractH })
    .toBuffer();

  let unrotated = sharp(cropped);
  if (frame.rotated) {
    unrotated = unrotated.rotate(270);
  }
  const unrotatedBuf = await unrotated.toBuffer();

  const srcW = Math.max(frame.sourceSize[0] || 0, frame.size[0]);
  const srcH = Math.max(frame.sourceSize[1] || 0, frame.size[1]);
  const ox = frame.offset[0] || 0;
  const oy = frame.offset[1] || 0;

  // Symmetrical padding canvas so sprite's Cocos2d-x anchor (center) is exactly at (halfW, halfH)
  const halfW = Math.ceil(Math.max(srcW / 2, frame.size[0] / 2 + Math.abs(ox)) + 2);
  const halfH = Math.ceil(Math.max(srcH / 2, frame.size[1] / 2 + Math.abs(oy)) + 2);
  const canvasW = halfW * 2;
  const canvasH = halfH * 2;

  const padLeft = Math.round(halfW + ox - frame.size[0] / 2);
  const padTop = Math.round(halfH - oy - frame.size[1] / 2);

  const paddedBuf = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: unrotatedBuf, left: Math.max(0, padLeft), top: Math.max(0, padTop) }])
    .png()
    .toBuffer();

  let pipe = sharp(paddedBuf);

  // Handle scaling / flipping around center
  if (scale[0] !== 1 || scale[1] !== 1) {
    const sw = Math.max(1, Math.round(canvasW * Math.abs(scale[0])));
    const sh = Math.max(1, Math.round(canvasH * Math.abs(scale[1])));
    pipe = pipe.resize(sw, sh);
    if (scale[0] < 0) pipe = pipe.flop();
    if (scale[1] < 0) pipe = pipe.flip();
  }

  // Handle rotation (sharp positive is clockwise, matching Cocos2d-x CCNode rotation)
  if (rotation !== 0) {
    pipe = pipe.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }

  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });

  if (color) {
    const r = color[0] / 255;
    const g = color[1] / 255;
    const b = color[2] / 255;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] * r);
      data[i + 1] = Math.round(data[i + 1] * g);
      data[i + 2] = Math.round(data[i + 2] * b);
    }
  }

  const pngBuf = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  return { buffer: pngBuf, width: info.width, height: info.height };
}

export interface RenderIconOptions {
  form: string;
  icon?: number;
  col1?: number;
  col2?: number;
  glow?: boolean | number;
  colG?: number;
  size?: number;
}

export async function renderGdPlayerIcon({
  form,
  icon = 1,
  col1 = 0,
  col2 = 0,
  glow = false,
  colG,
  size = 128,
}: RenderIconOptions): Promise<Buffer> {
  const cacheKey = `v3_${form}_${icon}_${col1}_${col2}_${glow ? 1 : 0}_${colG ?? 'x'}_${size}`;
  if (renderedIconCache.has(cacheKey)) {
    return renderedIconCache.get(cacheKey)!;
  }

  const cleanForm = (form || 'cube').toLowerCase();
  const prefix = GAMEMODE_PREFIXES[cleanForm] || 'player_';
  let pad = String(icon || 1).padStart(2, '0');
  let basename = prefix + pad;

  let pngPath = findExistingFile(POTENTIAL_ICON_DIRS, `${basename}-hd.png`);
  let frames = getPlistFrames(basename);

  // Fallback to default icon 01 if specific ID is not available
  if (!frames || !pngPath) {
    basename = prefix + '01';
    pngPath = findExistingFile(POTENTIAL_ICON_DIRS, `${basename}-hd.png`);
    frames = getPlistFrames(basename);
  }

  if (!frames || !pngPath) {
    throw new Error(`Icon assets not found for ${cleanForm} in GD resources.`);
  }

  const c1 = getGdColor(col1);
  const c2 = getGdColor(col2);
  const isBlack1 = c1[0] === 0 && c1[1] === 0 && c1[2] === 0;
  const isBlack2 = c2[0] === 0 && c2[1] === 0 && c2[2] === 0;
  const isAllBlack = isBlack1 && isBlack2;

  let cGlow = c2;
  if (colG !== undefined && colG !== null) {
    cGlow = getGdColor(colG);
  } else if (isBlack2) {
    cGlow = isBlack1 ? [255, 255, 255] : c1;
  }

  const shouldGlow = Boolean(glow) || isAllBlack;

  const canvasW = 160;
  const canvasH = 160;
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];

  if (cleanForm === 'robot' || cleanForm === 'spider') {
    const animFile = cleanForm === 'robot' ? 'Robot_AnimDesc.plist' : 'Spider_AnimDesc.plist';
    const animKey = cleanForm === 'robot' ? 'Robot_idle_001.png' : 'Spider_idle_001.png';
    const animPath = findExistingFile(POTENTIAL_RESOURCE_DIRS, animFile);

    if (animPath && !animCache.has(animKey)) {
      animCache.set(animKey, parseAnimDesc(fs.readFileSync(/*turbopackIgnore: true*/ animPath, 'utf8'), animKey));
    }
    const animSprites = animCache.get(animKey) || [];

    const layersToDraw: Array<{
      frame: FrameData;
      color: [number, number, number] | null;
      pos: [number, number];
      scale: [number, number];
      rot: number;
      z: number;
      isGlow: boolean;
    }> = [];

    for (const part of animSprites) {
      const partBase = part.texture.replace(/^(spider|robot)_01/, basename);
      const subTextures = [
        { name: partBase.replace('_001.png', '_2_001.png'), col: c2, isGlow: false },
        { name: partBase.replace('_001.png', '_3_001.png'), col: null, isGlow: false },
        { name: partBase, col: c1, isGlow: false },
        { name: partBase.replace('_001.png', '_extra_001.png'), col: null, isGlow: false },
      ];
      if (shouldGlow) {
        subTextures.push({ name: partBase.replace('_001.png', '_glow_001.png'), col: cGlow, isGlow: true });
      }

      const isSingleFlipped = Boolean(part.flipped[0]) !== Boolean(part.flipped[1]);
      const partScale: [number, number] = [
        part.scale[0] * (part.flipped[0] ? -1 : 1),
        part.scale[1] * (part.flipped[1] ? -1 : 1),
      ];

      for (const st of subTextures) {
        if (frames[st.name]) {
          layersToDraw.push({
            frame: frames[st.name],
            color: st.col,
            pos: part.pos,
            scale: partScale,
            // Cocos2d-x rotation is clockwise, matching sharp. Invert only if flipped on a single axis.
            rot: isSingleFlipped ? -part.rot : part.rot,
            z: part.z,
            isGlow: st.isGlow,
          });
        }
      }
    }

    // Glow layers placed beneath body parts
    layersToDraw.sort((a, b) => {
      if (a.isGlow && !b.isGlow) return -1;
      if (!a.isGlow && b.isGlow) return 1;
      return a.z - b.z;
    });

    for (const item of layersToDraw) {
      const rendered = await renderLayer(pngPath, item.frame, item.color, item.scale, item.rot);
      if (!rendered) continue;
      // In Cocos2d-x: +Y is UP, point to pixel factor is 2 for -hd.
      // In screen coordinates: +Y is DOWN.
      const posX = Math.round(item.pos[0] * 2);
      const posY = Math.round(-item.pos[1] * 2);
      const left = Math.round((canvasW - rendered.width) / 2 + posX);
      const top = Math.round((canvasH - rendered.height) / 2 + posY);
      composites.push({ input: rendered.buffer, left, top });
    }
  } else {
    // Normal single-sheet icon
    const layerNames: Array<{ name: string; col: [number, number, number] | null }> = [];
    if (shouldGlow && frames[`${basename}_glow_001.png`]) {
      layerNames.push({ name: `${basename}_glow_001.png`, col: cGlow });
    }
    if (frames[`${basename}_2_001.png`]) {
      layerNames.push({ name: `${basename}_2_001.png`, col: c2 });
    }
    if (frames[`${basename}_3_001.png`]) {
      layerNames.push({ name: `${basename}_3_001.png`, col: null });
    }
    if (frames[`${basename}_001.png`]) {
      layerNames.push({ name: `${basename}_001.png`, col: c1 });
    }
    if (frames[`${basename}_extra_001.png`]) {
      layerNames.push({ name: `${basename}_extra_001.png`, col: null });
    }

    for (const l of layerNames) {
      const f = frames[l.name];
      if (!f) continue;
      const rendered = await renderLayer(pngPath, f, l.col);
      if (!rendered) continue;
      // renderLayer already aligns sprite at the exact center including offset.
      // Do NOT add ox, -oy again (which caused double offset detachment bugs).
      const left = Math.round((canvasW - rendered.width) / 2);
      const top = Math.round((canvasH - rendered.height) / 2);
      composites.push({ input: rendered.buffer, left, top });
    }
  }

  // Composite layers and auto-trim transparent border
  const img = sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composites);

  const rawPng = await img.png().toBuffer();
  // Auto-trim transparent border and scale neatly into target size
  const trimmed = await sharp(rawPng).trim().toBuffer();
  const finalPng = await sharp(trimmed)
    .resize(size, size, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Cache in LRU
  if (renderedIconCache.size >= MAX_RENDER_CACHE) {
    const firstKey = renderedIconCache.keys().next().value;
    if (firstKey) renderedIconCache.delete(firstKey);
  }
  renderedIconCache.set(cacheKey, finalPng);

  return finalPng;
}
