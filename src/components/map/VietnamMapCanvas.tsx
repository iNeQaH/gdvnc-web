'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import {
  VIETNAM_PROVINCES_GEO,
  NEIGHBOR_COUNTRIES_GEO,
  VIETNAM_TOTAL_BOUNDS,
  isPointInPolygon,
  ProvinceGeoFeature,
} from '@/lib/vietnamGeoData';
import { extractProvinceFromLocation } from '@/lib/location';
import { FONT_PRESETS } from '@/components/UserDisplayName';

// Precalculate Bounding Boxes for Neighbor Countries once at module load
const NEIGHBOR_COUNTRIES_WITH_BOUNDS = NEIGHBOR_COUNTRIES_GEO.map((country) => {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const ring of country.polygons) {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return {
    name: country.name,
    bounds: [minLon, minLat, maxLon, maxLat] as [number, number, number, number],
    polygons: country.polygons,
  };
});

// Fast RGB parser & blender for ultra-fast color blending without CSS color-mix strings
interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseCssColor(color: string): RGB {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const num = parseInt(hex, 16);
    if (!isNaN(num)) {
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }
  }
  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    return { r: Number(match[0]), g: Number(match[1]), b: Number(match[2]) };
  }
  return { r: 56, g: 189, b: 248 };
}

function mixRgb(c1: RGB, c2: RGB, weight: number): string {
  const w = Math.max(0, Math.min(1, weight));
  const r = Math.round(c1.r * w + c2.r * (1 - w));
  const g = Math.round(c1.g * w + c2.g * (1 - w));
  const b = Math.round(c1.b * w + c2.b * (1 - w));
  return `rgb(${r},${g},${b})`;
}

function rgbaStr(c: RGB, alpha: number): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

function getUserThemeColor(player: any): string {
  if (!player) return '#38bdf8';
  if (player.profileTheme === 'sakura') return '#ec4899';
  if (player.profileTheme === 'lavender') return '#a855f7';
  if (player.profileTheme === 'mint') return '#10b981';
  if (player.profileTheme === 'peach') return '#f43f5e';
  if (player.profileTheme === 'mono') return '#94a3b8';
  if (player.profileTheme === 'glitch') return '#c084fc';
  if (player.profileTheme === 'amber') return '#f59e0b';
  if (player.profileTheme === 'crimson') return '#e11d48';
  if (player.profileTheme === 'custom') {
    const cfg = player.profileConfig;
    if (cfg?.customThemeColors?.[0]) return cfg.customThemeColors[0];
    if (cfg?.customThemeColor) return cfg.customThemeColor;
  }
  if (player.nameColor && typeof player.nameColor === 'string' && player.nameColor.startsWith('#')) {
    return player.nameColor;
  }
  return '#38bdf8';
}

// Phân bố toạ độ người chơi mở rộng theo diện tích thực tế của tỉnh (không bị co cụm ở các tỉnh rộng)
function getProvincePlayerOffset(
  province: { center: [number, number]; bounds: [number, number, number, number] },
  playerIndex: number,
  totalPlayers: number,
  zoom: number
): [number, number] {
  if (playerIndex === 0) {
    return [province.center[0], province.center[1]];
  }

  const [minLon, minLat, maxLon, maxLat] = province.bounds;
  const spanLon = Math.max(0.35, maxLon - minLon);
  const spanLat = Math.max(0.35, maxLat - minLat);

  // Bán kính phân tán tối đa theo kích thước địa lý của tỉnh
  // Cho phép trải rộng tới 44% span để phủ khắp các vùng/huyện của các tỉnh diện tích lớn
  const maxReachX = spanLon * 0.44;
  const maxReachY = spanLat * 0.44;

  // Với số lượng user ít (2-6 người), phân bố toả đều các hướng địa lý (Đông, Tây, Nam, Bắc...)
  // Với số lượng user đông (>6 người), dùng Golden Angle (~137.5°) để xoay toả đều tự nhiên
  let angle = 0;
  if (totalPlayers <= 6) {
    angle = ((2 * Math.PI) / Math.max(1, totalPlayers)) * playerIndex;
  } else {
    angle = playerIndex * 2.399963;
  }

  // Tỷ lệ phân tán trải đều rộng khắp tỉnh, không co cụm vào tâm
  const count = Math.max(2, totalPlayers);
  const progress = Math.min(1.0, (playerIndex + 0.6) / count);
  const spreadFactor = 0.45 + 0.55 * Math.sqrt(progress);

  const rx = maxReachX * spreadFactor;
  const ry = maxReachY * spreadFactor;

  const rawLon = province.center[0] + Math.cos(angle) * rx;
  const rawLat = province.center[1] + Math.sin(angle) * ry;

  // Giữ tọa độ an toàn tuyệt đối bên trong ranh giới bao quanh tỉnh (tránh lọt ra biển / ra ngoài)
  const safeLon = Math.max(minLon + 0.04, Math.min(maxLon - 0.04, rawLon));
  const safeLat = Math.max(minLat + 0.04, Math.min(maxLat - 0.04, rawLat));

  return [safeLon, safeLat];
}

function getCanvasGradientOrColor(
  ctx: CanvasRenderingContext2D,
  gradientStr: string | null | undefined,
  solidColor: string | null | undefined,
  x: number,
  y: number,
  w: number,
  fallback: string
): string | CanvasGradient {
  if (gradientStr) {
    const colors = gradientStr.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)|hsla?\([^)]+\)/g);
    if (colors && colors.length >= 2) {
      let cssDeg = 90;
      const degMatch = gradientStr.match(/([0-9]+(?:\.[0-9]+)?)deg/);
      if (degMatch) {
        cssDeg = parseFloat(degMatch[1]);
      }
      // CSS angle to radians: 90deg is horizontal (left to right, dx=1, dy=0)
      const rad = ((cssDeg - 90) * Math.PI) / 180;
      const len = Math.max(1, w);
      const x0 = x;
      const y0 = y;
      const x1 = x + Math.cos(rad) * len;
      const y1 = y + Math.sin(rad) * 16;
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      const step = 1 / (colors.length - 1);
      colors.forEach((col, idx) => {
        grad.addColorStop(Math.min(1, Math.max(0, idx * step)), col);
      });
      return grad;
    }
  }
  return solidColor || fallback;
}

function getCanvasFont(presetKey: string | null | undefined, basePx: number): { font: string; scale: number; weight: string; family: string } {
  if (!presetKey || !FONT_PRESETS[presetKey]) {
    return {
      font: `bold ${Math.round(basePx)}px sans-serif`,
      scale: 1,
      weight: 'bold',
      family: 'sans-serif',
    };
  }
  const preset = FONT_PRESETS[presetKey];
  const weight = preset.weight || 'bold';
  const scale = preset.scale || 1.0;
  const size = Math.round(basePx * scale);
  let fam = preset.family;
  if (!fam || fam === 'inherit') fam = 'sans-serif';
  return {
    font: `${weight} ${size}px ${fam}`,
    scale,
    weight,
    family: fam,
  };
}

// Tìm tỉnh theo toạ độ kinh độ / vĩ độ
function getProvinceAtCoords(lon: number, lat: number): string | null {
  for (const province of VIETNAM_PROVINCES_GEO) {
    if (province.region === 'Islands') {
      const [minLon, minLat, maxLon, maxLat] = province.bounds;
      if (lon >= minLon - 0.45 && lon <= maxLon + 0.45 && lat >= minLat - 0.45 && lat <= maxLat + 0.45) {
        return province.id;
      }
    }

    const [minLon, minLat, maxLon, maxLat] = province.bounds;
    if (lon < minLon - 0.1 || lon > maxLon + 0.1 || lat < minLat - 0.1 || lat > maxLat + 0.1) {
      continue;
    }

    for (const poly of province.polygons) {
      if (isPointInPolygon([lon, lat], poly)) {
        return province.id;
      }
    }
  }
  return null;
}

export interface VietnamMapCanvasProps {
  mapData: {
    nationalGrandTotal: number;
    maxScore: number;
    top1Province: string | null;
    top2Province: string | null;
    top3Province: string | null;
    provinces: Record<
      string,
      {
        totalScore: number;
        percent: number;
        nationalRank: number;
        playerCount: number;
        topPlayer: any | null;
        players: any[];
        hardestClassic?: { id: string; name: string; difficulty?: string | null; placement?: number | null } | null;
        clans?: Array<{ tag: string; color?: string | null; colorGradient?: string | null }>;
      }
    >;
  } | null;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string | null) => void;
  onHoverProvince?: (provinceId: string | null) => void;
  onCameraChange?: (cam: { zoom: number; yaw: number; pitch: number }) => void;
  currentUser: any;
  currentMode: string;
  is3D: boolean;
  onToggle3D: () => void;
  onRequestSnapToUser: number;
  onRequestFullReset?: number;
  showProvinceNamesOverlay?: boolean;
  zoomInTrigger?: number;
  zoomOutTrigger?: number;
}

interface CameraState {
  lon: number;
  lat: number;
  zoom: number;
  pitch: number; // 0 to 80 degrees
  yaw: number;   // 0 to 360 degrees (rotation)
  targetLon: number;
  targetLat: number;
  targetZoom: number;
  targetPitch: number;
  targetYaw: number;
}

function VietnamMapCanvasComponent({
  mapData,
  selectedProvinceId,
  onSelectProvince,
  onHoverProvince,
  onCameraChange,
  currentUser,
  currentMode,
  is3D,
  onToggle3D,
  onRequestSnapToUser,
  onRequestFullReset = 0,
  showProvinceNamesOverlay = false,
  zoomInTrigger = 0,
  zoomOutTrigger = 0,
}: VietnamMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Avatar image cache
  const avatarCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Starry sky generator
  const starsRef = useRef<Array<{ x: number; y: number; r: number; phase: number; speed: number }>>([]);
  if (starsRef.current.length === 0) {
    for (let i = 0; i < 90; i++) {
      starsRef.current.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.6 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 2.8,
      });
    }
  }

  // Interaction feedback overlay alphas
  const leftDragAlphaRef = useRef(0);
  const rightDragAlphaRef = useRef(0);

  // Camera state
  const cameraRef = useRef<CameraState>({
    lon: 107.5,
    lat: 16.0,
    zoom: 1.1,
    pitch: 0,
    yaw: 0,
    targetLon: 107.5,
    targetLat: 16.0,
    targetZoom: 1.1,
    targetPitch: 0,
    targetYaw: 0,
  });

  const hoveredProvinceIdRef = useRef<string | null>(null);
  const lastReportedCamRef = useRef<{ zoom: number; yaw: number; pitch: number } | null>(null);
  const lastCenterProvRef = useRef<string | null>(null);
  const lastSampledLonRef = useRef<number>(-999);
  const lastSampledLatRef = useRef<number>(-999);
  const lastSampledZoomRef = useRef<number>(-999);
  const lastSampledYawRef = useRef<number>(-999);
  const lastSampledPitchRef = useRef<number>(-999);

  // Store latest props in a ref so the main animation loop never restarts unnecessarily
  const latestPropsRef = useRef({
    mapData,
    selectedProvinceId,
    currentUser,
    currentMode,
    is3D,
    showProvinceNamesOverlay,
    onCameraChange,
    onHoverProvince,
    onSelectProvince,
  });
  latestPropsRef.current = {
    mapData,
    selectedProvinceId,
    currentUser,
    currentMode,
    is3D,
    showProvinceNamesOverlay,
    onCameraChange,
    onHoverProvince,
    onSelectProvince,
  };

  const themeCacheRef = useRef<{
    frameCount: number;
    themeBg: string;
    themeCard: string;
    themeAccent: string;
    themeBorder: string;
    themeTitle: string;
    isDarkTheme: boolean;
    rgbBg: RGB;
    rgbCard: RGB;
    rgbAccent: RGB;
    rgbBorder: RGB;
    neighborFill: string;
    neighborStroke: string;
    provinceDefaultFill: string;
  }>({
    frameCount: 0,
    themeBg: '#0b0f19',
    themeCard: '#151d2f',
    themeAccent: '#38bdf8',
    themeBorder: 'rgba(56, 189, 248, 0.4)',
    themeTitle: '#f8fafc',
    isDarkTheme: true,
    rgbBg: { r: 11, g: 15, b: 25 },
    rgbCard: { r: 21, g: 29, b: 47 },
    rgbAccent: { r: 56, g: 189, b: 248 },
    rgbBorder: { r: 56, g: 189, b: 248 },
    neighborFill: 'rgb(16,22,37)',
    neighborStroke: 'rgba(56,189,248,0.35)',
    provinceDefaultFill: 'rgba(21,29,47,0.85)',
  });

  const handoffStartTimeRef = useRef<number>(0);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragButtonRef = useRef<number>(0); // 0 = left, 2 = right
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedFarRef = useRef(false);

  // Initial handoff from sessionStorage (if transitioning seamlessly from /leaderboard)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };
    const handleGlobalBlur = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('blur', handleGlobalBlur);

    try {
      const raw = sessionStorage.getItem('gdvn_map_handoff');
      if (raw) {
        sessionStorage.removeItem('gdvn_map_handoff');
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < 3000) {
          cameraRef.current.lon = parsed.lon || 107.5;
          cameraRef.current.lat = parsed.lat || 16.0;
          cameraRef.current.zoom = parsed.zoom || 1.1;
          cameraRef.current.targetLon = parsed.lon || 107.5;
          cameraRef.current.targetLat = parsed.lat || 16.0;
          cameraRef.current.targetZoom = parsed.zoom || 1.1;
          handoffStartTimeRef.current = performance.now();
        }
      }
    } catch {}

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('blur', handleGlobalBlur);
    };
  }, []);

  // Zoom in / out buttons trigger (hỗ trợ zoom sâu vào từng góc phố / cụm người chơi)
  useEffect(() => {
    if (zoomInTrigger > 0) {
      cameraRef.current.targetZoom = Math.min(50.0, cameraRef.current.targetZoom * 1.35);
    }
  }, [zoomInTrigger]);

  useEffect(() => {
    if (zoomOutTrigger > 0) {
      cameraRef.current.targetZoom = Math.max(0.5, cameraRef.current.targetZoom / 1.35);
    }
  }, [zoomOutTrigger]);

  // User's province
  const userProvinceId = React.useMemo(() => {
    if (!currentUser?.country) return null;
    return extractProvinceFromLocation(currentUser.country);
  }, [currentUser]);

  // Snap to user when reset/compass button clicked
  useEffect(() => {
    if (onRequestSnapToUser === 0) return;
    cameraRef.current.targetYaw = 0; // reset rotation
    if (userProvinceId) {
      const p = VIETNAM_PROVINCES_GEO.find((item) => item.id === userProvinceId);
      if (p) {
        cameraRef.current.targetLon = p.center[0];
        cameraRef.current.targetLat = p.center[1];
        cameraRef.current.targetZoom = 3.6;
        return;
      }
    }
    // Fallback overview
    cameraRef.current.targetLon = 107.5;
    cameraRef.current.targetLat = 16.0;
    cameraRef.current.targetZoom = 1.1;
    cameraRef.current.targetPitch = 0;
  }, [onRequestSnapToUser, userProvinceId]);

  // Full reset map to 2D entire Vietnam overview
  useEffect(() => {
    if (onRequestFullReset === 0) return;
    cameraRef.current.targetYaw = 0;
    cameraRef.current.targetPitch = 0;
    cameraRef.current.targetLon = 107.5;
    cameraRef.current.targetLat = 16.0;
    cameraRef.current.targetZoom = 1.1;
  }, [onRequestFullReset]);

  // Handle 3D prop toggle
  useEffect(() => {
    cameraRef.current.targetPitch = is3D ? 65 : 0;
  }, [is3D]);

  // Fly to selected province when selected
  useEffect(() => {
    if (!selectedProvinceId) return;
    const p = VIETNAM_PROVINCES_GEO.find((item) => item.id === selectedProvinceId);
    if (p) {
      cameraRef.current.targetLon = p.center[0];
      cameraRef.current.targetLat = p.center[1];
      // calculate zoom so bounds fit nicely
      const spanLon = Math.max(0.4, p.bounds[2] - p.bounds[0]);
      const spanLat = Math.max(0.4, p.bounds[3] - p.bounds[1]);
      const maxSpan = Math.max(spanLon, spanLat);
      const fitZoom = Math.max(2.5, Math.min(6.5, 6.0 / maxSpan));
      cameraRef.current.targetZoom = fitZoom;
    }
  }, [selectedProvinceId]);

  // Coordinate projection helper with Yaw (Rotation) and Pitch (Tilt)
  const project = useCallback(
    (
      lon: number,
      lat: number,
      heightZ: number,
      cam: CameraState,
      width: number,
      height: number
    ): { x: number; y: number; visible: boolean; scale: number } => {
      const baseScale = 75 * cam.zoom;
      let wx = (lon - cam.lon) * baseScale;
      let wy = -(lat - cam.lat) * baseScale; // North is -wy, South is +wy

      // 1. Yaw rotation around vertical axis
      if (cam.yaw !== 0) {
        const radYaw = (cam.yaw * Math.PI) / 180;
        const cosY = Math.cos(radYaw);
        const sinY = Math.sin(radYaw);
        const rx = wx * cosY - wy * sinY;
        const ry = wx * sinY + wy * cosY;
        wx = rx;
        wy = ry;
      }

      // 2. Pitch tilt
      const radPitch = (cam.pitch * Math.PI) / 180;
      const sinP = Math.sin(radPitch);
      const cosP = Math.cos(radPitch);

      const focal = 900;
      const distFromCam = focal - wy * sinP + heightZ * cosP;
      if (distFromCam < 50) {
        return { x: 0, y: 0, visible: false, scale: 0 };
      }

      const projScale = focal / distFromCam;
      const yRot = wy * cosP - heightZ * sinP;

      const screenX = width / 2 + wx * projScale;
      const screenY = height / 2 + yRot * projScale + sinP * 140;

      return {
        x: screenX,
        y: screenY,
        visible: true,
        scale: projScale,
      };
    },
    []
  );

  // Inverse projection from screen point (sx, sy) to ground plane (lon, lat) at heightZ = 0
  const unproject = useCallback(
    (sx: number, sy: number, cam: CameraState, width: number, height: number): [number, number] => {
      const baseScale = 75 * cam.zoom;
      const radPitch = (cam.pitch * Math.PI) / 180;
      const sinP = Math.sin(radPitch);
      const cosP = Math.cos(radPitch);
      const focal = 900;

      const targetScreenY = sy - height / 2 - sinP * 140;
      const denom = cosP * focal + targetScreenY * sinP;
      const wyRot = denom !== 0 ? (targetScreenY * focal) / denom : 0;
      const dist = Math.max(50, focal - wyRot * sinP);
      const projScale = focal / dist;
      const wxRot = (sx - width / 2) / projScale;

      // Undo Yaw rotation
      let wx = wxRot;
      let wy = wyRot;
      if (cam.yaw !== 0) {
        const radYaw = (-cam.yaw * Math.PI) / 180;
        const cosY = Math.cos(radYaw);
        const sinY = Math.sin(radYaw);
        wx = wxRot * cosY - wyRot * sinY;
        wy = wxRot * sinY + wyRot * cosY;
      }

      const lon = cam.lon + wx / baseScale;
      const lat = cam.lat - wy / baseScale;

      return [lon, lat];
    },
    []
  );

  // Helper to load and cache avatar image
  const getAvatarImg = useCallback((url: string): HTMLImageElement | null => {
    if (!url) return null;
    let img = avatarCacheRef.current.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      avatarCacheRef.current.set(url, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }, []);

  // Main Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let pulsePhase = 0;

    const render = () => {
      pulsePhase += 0.05;

      // Smooth camera interpolation
      const cam = cameraRef.current;
      cam.lon += (cam.targetLon - cam.lon) * 0.12;
      cam.lat += (cam.targetLat - cam.lat) * 0.12;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.12;
      cam.pitch += (cam.targetPitch - cam.pitch) * 0.12;
      cam.yaw += (cam.targetYaw - cam.yaw) * 0.12;

      // Snapping micro deltas when camera is practically settled to save CPU
      if (Math.abs(cam.targetLon - cam.lon) < 0.00002) cam.lon = cam.targetLon;
      if (Math.abs(cam.targetLat - cam.lat) < 0.00002) cam.lat = cam.targetLat;
      if (Math.abs(cam.targetZoom - cam.zoom) < 0.0002) cam.zoom = cam.targetZoom;
      if (Math.abs(cam.targetPitch - cam.pitch) < 0.01) cam.pitch = cam.targetPitch;
      if (Math.abs(cam.targetYaw - cam.yaw) < 0.01) cam.yaw = cam.targetYaw;

      // Resize handling
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Throttled theme variables reading (at most once every 60 frames) to eliminate layout recalculation
      const tc = themeCacheRef.current;
      if (tc.frameCount++ % 60 === 0) {
        try {
          const computed = getComputedStyle(document.documentElement);
          const bg = computed.getPropertyValue('--bg-page').trim();
          const card = computed.getPropertyValue('--bg-card').trim();
          const acc = computed.getPropertyValue('--accent').trim();
          const bor = computed.getPropertyValue('--border-ui').trim();
          const tit = computed.getPropertyValue('--text-title').trim();
          if (bg) tc.themeBg = bg;
          if (card) tc.themeCard = card;
          if (acc) tc.themeAccent = acc;
          if (bor) tc.themeBorder = bor;
          if (tit) tc.themeTitle = tit;

          tc.rgbBg = parseCssColor(tc.themeBg);
          tc.rgbCard = parseCssColor(tc.themeCard);
          tc.rgbAccent = parseCssColor(tc.themeAccent);
          tc.rgbBorder = parseCssColor(tc.themeBorder);

          tc.isDarkTheme = !(
            tc.themeBg.startsWith('#f') ||
            tc.themeBg.startsWith('#e') ||
            tc.themeBg.startsWith('rgb(255') ||
            tc.themeBg.startsWith('rgb(24') ||
            tc.themeBg === '#ffffff'
          );

          tc.neighborFill = mixRgb(tc.rgbCard, tc.rgbBg, 0.45);
          tc.neighborStroke = tc.isDarkTheme ? rgbaStr(tc.rgbBorder, 0.4) : rgbaStr(tc.rgbBorder, 0.65);
          tc.provinceDefaultFill = rgbaStr(tc.rgbCard, 0.85);
        } catch {}
      }

      const {
        themeBg,
        themeCard,
        themeAccent,
        themeBorder,
        isDarkTheme,
        rgbBg,
        rgbCard,
        rgbAccent,
        neighborFill,
        neighborStroke,
        provinceDefaultFill,
      } = tc;

      const pitchNorm = Math.min(1, Math.max(0, cam.pitch / 80)); // 0 to 1
      let globalHorizonY = -999;

      // 1. Sky & Horizon Glow (only appears as pitch increases into 3D)
      if (pitchNorm > 0.05) {
        const radP = (cam.pitch * Math.PI) / 180;
        const sinP = Math.sin(radP);
        const cosP = Math.cos(radP);
        const cotP = cosP / sinP;
        const focal = 900;

        // Đường chân trời toán học chính xác theo phối cảnh 3D
        const horizonY = height / 2 + sinP * 140 - focal * cotP;
        globalHorizonY = horizonY;

        if (horizonY > 0) {
          const clampedHorizonY = Math.min(height, horizonY);

          // Bầu trời phía trên đường chân trời
          const skyGrad = ctx.createLinearGradient(0, 0, 0, clampedHorizonY);
          skyGrad.addColorStop(0, themeBg);
          skyGrad.addColorStop(0.7, mixRgb(rgbAccent, rgbBg, 0.18));
          skyGrad.addColorStop(1, mixRgb(rgbAccent, rgbBg, 0.38));
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, width, clampedHorizonY);

          // 1b. Ngôi sao lấp lánh thật bé trên bầu trời (xoay vòm trời theo góc yaw của map)
          if (clampedHorizonY > 15) {
            ctx.save();
            for (const star of starsRef.current) {
              const sx = (((star.x + cam.yaw / 360) % 1 + 1) % 1) * width;
              const sy = star.y * (clampedHorizonY * 0.95);
              const twinkle = 0.25 + 0.75 * Math.abs(Math.sin(pulsePhase * star.speed + star.phase));
              ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.85})`;
              ctx.beginPath();
              ctx.arc(sx, sy, star.r, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          // 2. Thiên Thể 3D: Mặt Trời Synthwave và Mặt Trăng Xanh Trắng ở 2 đầu đối diện, xoay cùng chiều theo góc yaw
          const celestialRadius = Math.min(width, height) * 0.19;
          const riseProgress = Math.max(0, Math.min(1, (pitchNorm - 0.12) / 0.72));

          if (riseProgress > 0) {
            const celestialY = horizonY + (1 - riseProgress) * celestialRadius * 0.82 - riseProgress * celestialRadius * 0.45;
            const cx = width / 2;

            // Góc toạ độ Mặt Trời theo yaw (khi xoay theo chiều kim đồng hồ, mặt trời đi sang phải cùng chiều kim đồng hồ)
            const relSunRad = (cam.yaw * Math.PI) / 180;
            const sunX = cx + Math.sin(relSunRad) * (width * 0.95);
            const sunInFront = Math.cos(relSunRad) > -0.25;

            // Góc toạ độ Mặt Trăng đối diện 180 độ
            const relMoonRad = relSunRad + Math.PI;
            const moonX = cx + Math.sin(relMoonRad) * (width * 0.95);
            const moonInFront = Math.cos(relMoonRad) > -0.25;

            // 2A. MẶT TRỜI SYNTHWAVE (Phần đáy thuần màu hồng neon, không theo màu theme)
            if (sunInFront && sunX >= -celestialRadius * 2 && sunX <= width + celestialRadius * 2) {
              // Hào quang hồng cam rực rỡ
              const haloGrad = ctx.createRadialGradient(
                sunX,
                celestialY,
                celestialRadius * 0.2,
                sunX,
                celestialY,
                celestialRadius * 2.2
              );
              haloGrad.addColorStop(0, 'rgba(244, 63, 94, 0.5)');
              haloGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.2)');
              haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = haloGrad;
              ctx.beginPath();
              ctx.arc(sunX, celestialY, celestialRadius * 2.2, 0, Math.PI * 2);
              ctx.fill();

              // Đĩa mặt trời synthwave
              ctx.save();
              ctx.beginPath();
              ctx.arc(sunX, celestialY, celestialRadius, 0, Math.PI * 2);
              ctx.clip();

              // Gradient mặt trời: vàng sáng -> cam rực -> hồng neon (đáy hồng thuần túy)
              const sunGrad = ctx.createLinearGradient(sunX, celestialY - celestialRadius, sunX, celestialY + celestialRadius);
              sunGrad.addColorStop(0, '#fef08a');
              sunGrad.addColorStop(0.32, '#f97316');
              sunGrad.addColorStop(0.68, '#f43f5e');
              sunGrad.addColorStop(1, '#ec4899'); // Đáy hồng neon tuyệt đẹp
              ctx.fillStyle = sunGrad;
              ctx.fillRect(sunX - celestialRadius, celestialY - celestialRadius, celestialRadius * 2, celestialRadius * 2);

              // Các sọc ngang synthwave cắt dần ở nửa dưới mặt trời
              ctx.fillStyle = themeBg;
              const stripeCount = 8;
              for (let s = 0; s < stripeCount; s++) {
                const norm = (s + 1) / (stripeCount + 1);
                const stripeY = celestialY + norm * celestialRadius;
                const stripeH = 1.5 + norm * 4.5;
                ctx.fillRect(sunX - celestialRadius, stripeY, celestialRadius * 2, stripeH);
              }
              ctx.restore();
            }

            // 2B. MẶT TRĂNG XANH TRẮNG KHÔNG SYNTHWAVE (Ở đầu đối diện 180 độ)
            if (moonInFront && moonX >= -celestialRadius * 2 && moonX <= width + celestialRadius * 2) {
              // Hào quang xanh băng thanh khiết
              const moonHalo = ctx.createRadialGradient(
                moonX,
                celestialY,
                celestialRadius * 0.2,
                moonX,
                celestialY,
                celestialRadius * 2.2
              );
              moonHalo.addColorStop(0, 'rgba(186, 230, 253, 0.45)');
              moonHalo.addColorStop(0.5, 'rgba(125, 211, 252, 0.16)');
              moonHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = moonHalo;
              ctx.beginPath();
              ctx.arc(moonX, celestialY, celestialRadius * 2.2, 0, Math.PI * 2);
              ctx.fill();

              // Đĩa mặt trăng tròn đầy, mịn màng, không có sọc synthwave
              ctx.save();
              ctx.beginPath();
              ctx.arc(moonX, celestialY, celestialRadius, 0, Math.PI * 2);
              ctx.clip();

              const moonGrad = ctx.createLinearGradient(
                moonX - celestialRadius * 0.4,
                celestialY - celestialRadius,
                moonX + celestialRadius * 0.4,
                celestialY + celestialRadius
              );
              moonGrad.addColorStop(0, '#ffffff');
              moonGrad.addColorStop(0.35, '#f0f9ff');
              moonGrad.addColorStop(0.75, '#bae6fd');
              moonGrad.addColorStop(1, '#7dd3fc');
              ctx.fillStyle = moonGrad;
              ctx.fillRect(moonX - celestialRadius, celestialY - celestialRadius, celestialRadius * 2, celestialRadius * 2);

              // Chi tiết hố mặt trăng mờ nhẹ tự nhiên
              ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
              ctx.beginPath();
              ctx.arc(moonX - celestialRadius * 0.3, celestialY - celestialRadius * 0.2, celestialRadius * 0.22, 0, Math.PI * 2);
              ctx.arc(moonX + celestialRadius * 0.25, celestialY + celestialRadius * 0.2, celestialRadius * 0.28, 0, Math.PI * 2);
              ctx.arc(moonX + celestialRadius * 0.3, celestialY - celestialRadius * 0.35, celestialRadius * 0.16, 0, Math.PI * 2);
              ctx.fill();

              ctx.restore();
            }
          }

          // 3. Nền đất / biển phía dưới đường chân trời che phủ chân mặt trời một cách tự nhiên
          const groundGrad = ctx.createLinearGradient(0, clampedHorizonY, 0, height);
          groundGrad.addColorStop(0, mixRgb(rgbBg, { r: 0, g: 0, b: 0 }, 0.92));
          groundGrad.addColorStop(1, themeBg);
          ctx.fillStyle = groundGrad;
          ctx.fillRect(0, clampedHorizonY, width, height - clampedHorizonY);

          // Dải sương mù khí quyển nhẹ nhàng ở đường chân trời
          const hazeGrad = ctx.createLinearGradient(0, horizonY - 12, 0, horizonY + 20);
          hazeGrad.addColorStop(0, 'rgba(0,0,0,0)');
          hazeGrad.addColorStop(0.5, rgbaStr(rgbAccent, 0.25));
          hazeGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = hazeGrad;
          ctx.fillRect(0, horizonY - 12, width, 32);
        } else {
          ctx.fillStyle = themeBg;
          ctx.fillRect(0, 0, width, height);
        }
      } else {
        // Nền 2D phẳng theo theme
        ctx.fillStyle = themeBg;
        ctx.fillRect(0, 0, width, height);
      }

      // Pre-compute frame projection constants (zero per-vertex trig calls)
      const baseScale = 75 * cam.zoom;
      const camLon = cam.lon;
      const camLat = cam.lat;
      const radYaw = (cam.yaw * Math.PI) / 180;
      const cosY = Math.cos(radYaw);
      const sinY = Math.sin(radYaw);
      const hasYaw = Math.abs(cam.yaw) > 0.001;

      const radPitch = (cam.pitch * Math.PI) / 180;
      const sinP = Math.sin(radPitch);
      const cosP = Math.cos(radPitch);
      const focal = 900;
      const pitchYOffset = sinP * 140;
      const halfW = width / 2;
      const halfH = height / 2;

      // Ultra-fast inlined projection for ground coordinates (heightZ = 0)
      const fastProjectGround = (lon: number, lat: number) => {
        let wx = (lon - camLon) * baseScale;
        let wy = -(lat - camLat) * baseScale;
        if (hasYaw) {
          const rx = wx * cosY - wy * sinY;
          wy = wx * sinY + wy * cosY;
          wx = rx;
        }
        const dist = focal - wy * sinP;
        if (dist < 40) return null;
        const scale = focal / dist;
        return {
          x: halfW + wx * scale,
          y: halfH + wy * cosP * scale + pitchYOffset,
          scale,
        };
      };

      // Viewport Bounding Box Culling helper
      const isBoxVisible = (minLon: number, minLat: number, maxLon: number, maxLat: number) => {
        if (
          camLon >= minLon - 0.25 &&
          camLon <= maxLon + 0.25 &&
          camLat >= minLat - 0.25 &&
          camLat <= maxLat + 0.25
        ) {
          return true;
        }
        const p1 = fastProjectGround(minLon, minLat);
        const p2 = fastProjectGround(maxLon, minLat);
        const p3 = fastProjectGround(maxLon, maxLat);
        const p4 = fastProjectGround(minLon, maxLat);
        if (!p1 || !p2 || !p3 || !p4) return true;

        const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
        const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
        const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
        const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

        if (maxX < -50 || minX > width + 50 || maxY < -50 || minY > height + 50) {
          return false;
        }
        return true;
      };

      // Handoff entrance animation: provinces, borders and details smoothly fade in
      let mapFadeAlpha = 1.0;
      let detailsFadeAlpha = 1.0;

      if (handoffStartTimeRef.current > 0) {
        const elapsed = performance.now() - handoffStartTimeRef.current;
        const totalDuration = 700;
        if (elapsed < totalDuration) {
          const p = elapsed / totalDuration;
          const ease = 1 - Math.pow(1 - p, 2.5);
          mapFadeAlpha = Math.min(1, ease * 1.25);
          detailsFadeAlpha = Math.max(0, (ease - 0.25) / 0.75);
        } else {
          handoffStartTimeRef.current = 0;
        }
      }

      // 4. Vẽ Các Quốc Gia Lân Cận (Frustum culled + fast projected)
      ctx.save();
      ctx.globalAlpha = mapFadeAlpha;
      ctx.strokeStyle = neighborStroke;
      ctx.fillStyle = neighborFill;
      ctx.lineWidth = isDarkTheme ? 1.2 : 1.6;

      for (const country of NEIGHBOR_COUNTRIES_WITH_BOUNDS) {
        if (!isBoxVisible(country.bounds[0], country.bounds[1], country.bounds[2], country.bounds[3])) {
          continue;
        }
        for (const ring of country.polygons) {
          ctx.beginPath();
          let started = false;
          for (const [lon, lat] of ring) {
            const pt = fastProjectGround(lon, lat);
            if (!pt) continue;
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
          if (started) {
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Read current dynamic props from ref (decoupled from render effect)
      const {
        mapData,
        selectedProvinceId,
        currentUser,
        currentMode,
        showProvinceNamesOverlay,
      } = latestPropsRef.current;

      const top1 = mapData?.top1Province;
      const top2 = mapData?.top2Province;
      const top3 = mapData?.top3Province;
      const maxScore = mapData?.maxScore || 1;
      const hoveredProv = hoveredProvinceIdRef.current;

      // 5. Vẽ 63 Tỉnh Thành Việt Nam + Hoàng Sa & Trường Sa (Frustum culled)
      ctx.save();
      ctx.globalAlpha = mapFadeAlpha;
      for (const province of VIETNAM_PROVINCES_GEO) {
        if (
          province.region !== 'Islands' &&
          !isBoxVisible(province.bounds[0], province.bounds[1], province.bounds[2], province.bounds[3])
        ) {
          continue;
        }

        const isHovered = hoveredProv === province.id;
        const isSelected = selectedProvinceId === province.id;
        const isUserProvince = userProvinceId === province.id;

        const pData = mapData?.provinces[province.id];
        const score = pData?.totalScore || 0;
        const scoreRatio = maxScore > 0 ? Math.min(1, score / maxScore) : 0;

        const isRank1 = top1 === province.id;
        const isRank2 = top2 === province.id;
        const isRank3 = top3 === province.id;

        for (const poly of province.polygons) {
          ctx.beginPath();
          let hasFirst = false;

          for (const [lon, lat] of poly) {
            const pt = fastProjectGround(lon, lat);
            if (!pt) continue;
            if (!hasFirst) {
              ctx.moveTo(pt.x, pt.y);
              hasFirst = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }

          if (!hasFirst) continue;
          ctx.closePath();

          // Xử lý riêng cho Quần đảo Hoàng Sa & Trường Sa: Nổi bật hình dạng đảo tự nhiên
          if (province.region === 'Islands') {
            ctx.fillStyle = isSelected || isHovered
              ? mixRgb(rgbAccent, { r: 255, g: 255, b: 255 }, 0.85)
              : mixRgb(rgbAccent, rgbCard, 0.4);
            ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : themeAccent;
            ctx.lineWidth = Math.max(1.2, Math.min(2.5, 1.2 * cam.zoom));
            ctx.fill();
            ctx.stroke();
            continue;
          }

          // Sắc độ đậm nhạt (Choropleth theo Theme)
          if (score === 0) {
            ctx.fillStyle = isHovered
              ? mixRgb(rgbAccent, rgbCard, 0.2)
              : provinceDefaultFill;
          } else {
            const alpha = 0.35 + scoreRatio * 0.55;
            if (isRank1) {
              ctx.fillStyle = `rgba(234, 179, 8, ${alpha})`;
            } else if (isRank2) {
              ctx.fillStyle = `rgba(203, 213, 225, ${alpha * 0.9})`;
            } else if (isRank3) {
              ctx.fillStyle = `rgba(217, 119, 6, ${alpha * 0.9})`;
            } else {
              ctx.fillStyle = mixRgb(rgbAccent, rgbCard, alpha);
            }
          }
          ctx.fill();

          // Đường ranh giới sáng màu viền theme
          if (isUserProvince) {
            const pulse = 0.5 + 0.5 * Math.sin(pulsePhase * 2.5);
            ctx.strokeStyle = mixRgb(rgbAccent, { r: 255, g: 255, b: 255 }, 0.9);
            ctx.lineWidth = 3.2 + pulse * 1.5;
            ctx.stroke();
          } else if (isRank1) {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.8;
            ctx.stroke();
          } else if (isRank2) {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2.4;
            ctx.stroke();
          } else if (isRank3) {
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2.4;
            ctx.stroke();
          } else if (isSelected || isHovered) {
            ctx.strokeStyle = isDarkTheme ? '#ffffff' : themeAccent;
            ctx.lineWidth = 2.6;
            ctx.stroke();
          } else {
            ctx.strokeStyle = isDarkTheme ? themeBorder : rgbaStr(rgbAccent, 0.75);
            ctx.lineWidth = isDarkTheme ? 1.5 : 2.0;
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // 5b. ĐẶC BIỆT NỔI BẬT: Quần đảo Hoàng Sa & Quần đảo Trường Sa (Chủ Quyền Việt Nam)
      const islandsList = VIETNAM_PROVINCES_GEO.filter((p) => p.region === 'Islands');
      islandsList.forEach((island) => {
        const isHovered = hoveredProv === island.id;
        const isSelected = selectedProvinceId === island.id;
        const isUserProvince = userProvinceId === island.id;
        const pt = fastProjectGround(island.center[0], island.center[1]);
        if (!pt) return;

        ctx.save();
        ctx.globalAlpha = mapFadeAlpha;
        // Vòng tròn định vị hải phận phát sáng tỏa lan (Beacon Pulse)
        const pulse = 0.5 + 0.5 * Math.sin(pulsePhase * 2.0);
        const beaconRadius = (16 + pulse * 10) * pt.scale;

        // Vòng sóng radar tỏa ra
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, beaconRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isUserProvince
          ? 'rgba(250, 204, 21, 0.7)'
          : rgbaStr(rgbAccent, 0.55);
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Điểm tâm đảo rực sáng sắc nét (crisp stroke thay vì shadowBlur nặng)
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(5, 7 * pt.scale), 0, Math.PI * 2);
        ctx.fillStyle = isSelected || isHovered ? '#ffffff' : themeAccent;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Bảng tên chủ quyền Hoàng Sa / Trường Sa luôn rõ ràng, nổi bật
        const labelText = island.id.includes('Hoàng Sa')
          ? 'Quần đảo Hoàng Sa'
          : 'Quần đảo Trường Sa';

        ctx.font = 'bold 11px sans-serif';
        const tm = ctx.measureText(labelText);
        const pillW = tm.width + 20;
        const pillH = 22;
        const pillY = pt.y + 18 * pt.scale;

        ctx.fillStyle = isDarkTheme ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : themeAccent;
        ctx.lineWidth = isSelected || isHovered ? 2 : 1.4;
        ctx.beginPath();
        ctx.roundRect(pt.x - pillW / 2, pillY - pillH / 2, pillW, pillH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isDarkTheme ? '#f8fafc' : '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, pt.x, pillY);
        ctx.restore();
      });

      // 6. 3D Skyscraper City Mode (khi pitch > 12 độ) & Cột Thẳng Đứng 90 độ (topX = baseX)
      if (cam.pitch > 12 && !showProvinceNamesOverlay) {
        const buildingsToRender: Array<{
          basePt: { x: number; y: number; scale: number };
          topPt: { x: number; y: number; scale: number };
          player: any;
          isCurrentUser: boolean;
          rankInProvince: number;
          lat: number;
        }> = [];

        // Phân cấp hiển thị người dùng (xa hơn một chút là đã có avatar, zoom gần hiện nhiều người dùng hơn)
        let maxPlayersPerProvince = 0;
        let showName = false;

        if (cam.zoom < 0.75) {
          maxPlayersPerProvince = 0;
        } else if (cam.zoom < 1.4) {
          maxPlayersPerProvince = 1;
          showName = false;
        } else if (cam.zoom < 2.0) {
          maxPlayersPerProvince = 1;
          showName = true;
        } else if (cam.zoom < 2.8) {
          maxPlayersPerProvince = 3;
          showName = true;
        } else if (cam.zoom < 3.8) {
          maxPlayersPerProvince = 6;
          showName = true;
        } else {
          maxPlayersPerProvince = 999;
          showName = true;
        }

        if (maxPlayersPerProvince > 0) {
          for (const province of VIETNAM_PROVINCES_GEO) {
            // Frustum cull distant provinces
            if (!isBoxVisible(province.bounds[0], province.bounds[1], province.bounds[2], province.bounds[3])) {
              continue;
            }

            const pData = mapData?.provinces[province.id];
            if (!pData || !pData.players || pData.players.length === 0) continue;

            const playersCount = Math.min(pData.players.length, maxPlayersPerProvince);
            for (let i = 0; i < playersCount; i++) {
              const player = pData.players[i];
              const isMe =
                currentUser &&
                (player.id === currentUser.id ||
                  player.username === currentUser.username ||
                  player.gdUsername === currentUser.gdUsername);

              const [bLon, bLat] = getProvincePlayerOffset(province, i, playersCount, cam.zoom);
              const rankFactor = 1 - i / Math.max(1, playersCount);
              const buildingH = (35 + rankFactor * 140 + (isMe ? 35 : 0)) * pitchNorm;

              const base = fastProjectGround(bLon, bLat);
              if (!base) continue;
              const top = {
                x: base.x,
                y: base.y - buildingH * base.scale,
                scale: base.scale,
              };

              buildingsToRender.push({
                basePt: base,
                topPt: top,
                player,
                isCurrentUser: !!isMe,
                rankInProvince: i + 1,
                lat: bLat,
              });
            }
          }
        }

        // Sắp xếp vẽ từ xa tới gần (basePt.y nhỏ = gần chân trời vẽ trước, basePt.y lớn vẽ sau)
        buildingsToRender.sort((a, b) => a.basePt.y - b.basePt.y);

        // Bắt đầu từ zoom 6x trở lên mới bắt đầu phóng to tên và avatar người dùng (dưới 6x giữ kích thước gốc 1.0)
        const zoomScale = cam.zoom < 6.0 ? 1.0 : Math.min(3.0, 1.0 + Math.pow((cam.zoom - 6.0) / 7.0, 0.65));

        ctx.save();
        ctx.globalAlpha = detailsFadeAlpha;

        buildingsToRender.forEach((b) => {
          const isMe = b.isCurrentUser;
          const stemColor = isMe ? '#f59e0b' : getUserThemeColor(b.player);

          const avatarSize = Math.round(24 * zoomScale);
          const baseFontSize = Math.round(11 * zoomScale);

          ctx.save();

          // 1. Line mỏng thẳng đứng từ chân toạ độ mặt đất lên đỉnh (MỜ HƠN: alpha 0.35)
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = stemColor;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(b.basePt.x, b.basePt.y);
          ctx.lineTo(b.topPt.x, b.topPt.y);
          ctx.stroke();
          ctx.restore();

          // 2. Chấm tròn nhỏ dưới chân line trên mặt đất (ĐẬM RÕ: alpha 1.0)
          ctx.save();
          ctx.globalAlpha = 1.0;
          const dotRadius = Math.max(2.5, Math.min(4.5, 3 * b.basePt.scale));
          ctx.fillStyle = stemColor;
          ctx.beginPath();
          ctx.arc(b.basePt.x, b.basePt.y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 3. Line đậm ngắn vuông góc với line mỏng dưới user (ĐẬM RÕ: alpha 1.0)
          ctx.save();
          ctx.globalAlpha = 1.0;
          const tickHalfW = Math.max(9, Math.min(24, avatarSize / 2 + 2));
          ctx.lineWidth = Math.max(3, 3.5 * zoomScale);
          ctx.lineCap = 'round';
          ctx.strokeStyle = stemColor;
          ctx.beginPath();
          ctx.moveTo(b.topPt.x - tickHalfW, b.topPt.y);
          ctx.lineTo(b.topPt.x + tickHalfW, b.topPt.y);
          ctx.stroke();
          ctx.restore();

          ctx.restore();

          // Tia sáng định vị thẳng đứng lên trời cho user chính mình
          if (isMe) {
            const beam = ctx.createLinearGradient(b.topPt.x, b.topPt.y, b.topPt.x, b.topPt.y - 140);
            beam.addColorStop(0, 'rgba(250, 204, 21, 0.9)');
            beam.addColorStop(1, 'rgba(250, 204, 21, 0)');
            ctx.fillStyle = beam;
            ctx.fillRect(b.topPt.x - 1.5, b.topPt.y - 140, 3, 140);
          }

          // 4. BADGE TRÊN ĐỈNH (Đặt ngay ngắn phía trên line đậm vuông góc)
          ctx.save();
          const displayName = b.player.displayName || b.player.gdUsername || b.player.username || '?';
          const avX = b.topPt.x - avatarSize / 2;
          const avY = b.topPt.y - avatarSize - 6;

          // Avatar bo góc (crisp stroke, no Gaussian shadowBlur)
          ctx.save();
          if (b.player.avatarUrl) {
            const img = getAvatarImg(b.player.avatarUrl);
            if (img) {
              ctx.beginPath();
              ctx.roundRect(avX, avY, avatarSize, avatarSize, Math.max(4, 5 * zoomScale));
              ctx.clip();
              ctx.drawImage(img, avX, avY, avatarSize, avatarSize);
            } else {
              ctx.fillStyle = stemColor;
              ctx.beginPath();
              ctx.roundRect(avX, avY, avatarSize, avatarSize, Math.max(4, 5 * zoomScale));
              ctx.fill();
            }
          } else {
            ctx.fillStyle = stemColor;
            ctx.beginPath();
            ctx.roundRect(avX, avY, avatarSize, avatarSize, Math.max(4, 5 * zoomScale));
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(11 * zoomScale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayName.charAt(0).toUpperCase(), avX + avatarSize / 2, avY + avatarSize / 2);
          }
          ctx.restore();

          // Viền mỏng sắc nét quanh avatar theo màu theme của user
          ctx.strokeStyle = isMe ? '#facc15' : stemColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(avX, avY, avatarSize, avatarSize, Math.max(4, 5 * zoomScale));
          ctx.stroke();

          // KHI ZOOM ĐỦ GẦN (showName = true): Hiện thêm Clan bên trái tên + Tên theo font profile + Điểm
          if (showName) {
            const textStartX = avX + avatarSize + 6;
            const textCenterY = avY + avatarSize / 2;

            ctx.save();
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            ctx.lineWidth = isDarkTheme ? 2.5 : 3.0;
            ctx.strokeStyle = isDarkTheme ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)';
            ctx.lineJoin = 'round';

            let curTextX = textStartX;

            // 1. Clan bên trái tên kèm màu sắc hoặc gradient
            const clanTag = b.player.clanTag || b.player.clan?.tag;
            if (clanTag) {
              ctx.font = `bold ${Math.round(10 * zoomScale)}px monospace`;
              const tagStr = `[${clanTag}] `;
              const tagW = ctx.measureText(tagStr).width;
              ctx.fillStyle = getCanvasGradientOrColor(
                ctx,
                b.player.clanGradient || b.player.clan?.colorGradient,
                b.player.clanColor || b.player.clan?.color,
                curTextX,
                textCenterY,
                tagW,
                '#38bdf8'
              );
              ctx.strokeText(tagStr, curTextX, textCenterY);
              ctx.fillText(tagStr, curTextX, textCenterY);
              curTextX += tagW;
            }

            // 2. Tên người chơi hiển thị theo font profile & gradient
            const fontInfo = getCanvasFont(b.player.nameFont, baseFontSize);
            ctx.font = fontInfo.font;
            const nameW = ctx.measureText(displayName).width;
            const defaultNameCol = isMe ? '#fef08a' : (isDarkTheme ? '#ffffff' : '#0f172a');

            ctx.fillStyle = getCanvasGradientOrColor(
              ctx,
              b.player.nameGradient,
              b.player.nameColor,
              curTextX,
              textCenterY,
              nameW,
              defaultNameCol
            );
            ctx.strokeText(displayName, curTextX, textCenterY);
            ctx.fillText(displayName, curTextX, textCenterY);
            curTextX += nameW;

            // 3. Điểm số cùng dòng bên cạnh tên (chỉ hiện khi KHÔNG PHẢI mode POPULATION)
            if (currentMode !== 'POPULATION') {
              const scoreVal = Math.round(
                b.player.score ??
                  b.player.classicPp ??
                  b.player.platformerPp ??
                  b.player.challengePp ??
                  b.player.creatorPoints ??
                  b.player.statValue ??
                  b.player.gdStars ??
                  b.player.activityPoints ??
                  0
              );
              const scoreText = ` • ${scoreVal.toLocaleString()}`;
              ctx.font = `bold ${Math.round(10 * zoomScale)}px sans-serif`;
              ctx.fillStyle = isMe ? '#facc15' : themeAccent;
              ctx.strokeText(scoreText, curTextX, textCenterY);
              ctx.fillText(scoreText, curTextX, textCenterY);
            }

            ctx.restore();
          }

          ctx.restore();
        });
        ctx.restore();
      }

      // 7. SỐ PHẦN TRĂM (%) TRÊN TỪNG TỈNH:
      if (cam.pitch <= 15) {
        const percentAlpha = (cam.zoom < 1.6 ? 0.95 : Math.max(0.42, 0.95 - (cam.zoom - 1.6) * 0.14)) * detailsFadeAlpha;

        for (const province of VIETNAM_PROVINCES_GEO) {
          if (!isBoxVisible(province.bounds[0], province.bounds[1], province.bounds[2], province.bounds[3])) {
            continue;
          }
          const pt = fastProjectGround(province.center[0], province.center[1]);
          if (!pt) continue;

          const pData = mapData?.provinces[province.id];
          if (!pData || !pData.percent || pData.percent <= 0) continue;

          const fontSize = Math.max(10, Math.min(13, 10 + cam.zoom * 0.7));
          const hasUserBadgeAtCenter = cam.zoom >= 1.3 && pData.players && pData.players.length > 0;
          const textY = hasUserBadgeAtCenter ? pt.y + 19 : pt.y;

          ctx.save();
          ctx.globalAlpha = percentAlpha;
          ctx.fillStyle = isDarkTheme ? mixRgb(rgbAccent, { r: 255, g: 255, b: 255 }, 0.65) : '#0f172a';
          ctx.font = `600 ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${pData.percent}%`, pt.x, textY);
          ctx.restore();
        }
      }

      // 8. Reset Effect: Hiện tên tỉnh thành trong 2s (khi showProvinceNamesOverlay = true)
      if (showProvinceNamesOverlay) {
        for (const province of VIETNAM_PROVINCES_GEO) {
          if (!isBoxVisible(province.bounds[0], province.bounds[1], province.bounds[2], province.bounds[3])) {
            continue;
          }
          const pt = fastProjectGround(province.center[0], province.center[1]);
          if (!pt) continue;

          ctx.save();
          ctx.font = 'bold 11px sans-serif';
          const tm = ctx.measureText(province.id);
          const pillW = tm.width + 16;
          const pillH = 20;

          ctx.fillStyle = isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)';
          ctx.strokeStyle = themeAccent;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(pt.x - pillW / 2, pt.y - pillH / 2, pillW, pillH, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isDarkTheme ? '#ffffff' : '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(province.id, pt.x, pt.y);
          ctx.restore();
        }
      }

      // 9. CHẾ ĐỘ 2D: PHÂN TẦNG HIỂN THỊ NGƯỜI CHƠI (LOD PROGRESSION THEO ZOOM)
      if (cam.pitch <= 15 && !showProvinceNamesOverlay && cam.zoom >= 1.3) {
        let max2DPlayers = 1;
        let show2DName = false;

        if (cam.zoom < 2.0) {
          max2DPlayers = 1;
          show2DName = false;
        } else if (cam.zoom < 3.0) {
          max2DPlayers = 1;
          show2DName = true;
        } else if (cam.zoom < 4.2) {
          max2DPlayers = 3;
          show2DName = true;
        } else {
          max2DPlayers = 999;
          show2DName = true;
        }

        ctx.save();
        ctx.globalAlpha = detailsFadeAlpha;

        // Thu thập toàn bộ badge người chơi hiển thị trên màn hình để giải quyết va chạm (Anti-Overlap)
        interface Badge2DItem {
          player: any;
          provinceId: string;
          isMe: boolean;
          userTheme: string;
          originalPt: { x: number; y: number };
          x: number;
          y: number;
          badgeW: number;
          badgeH: number;
          avSize: number;
          padX: number;
          clanW: number;
          clanText: string;
          nameW: number;
          scoreW: number;
          scoreText: string;
          displayName: string;
          fontInfo: any;
          show2DName: boolean;
          zoomScale2D: number;
        }

        const badges2D: Badge2DItem[] = [];

        for (const province of VIETNAM_PROVINCES_GEO) {
          if (!isBoxVisible(province.bounds[0], province.bounds[1], province.bounds[2], province.bounds[3])) {
            continue;
          }

          const pData = mapData?.provinces[province.id];
          if (!pData || !pData.players || pData.players.length === 0) continue;

          const playersCount = Math.min(pData.players.length, max2DPlayers);
          for (let i = 0; i < playersCount; i++) {
            const player = pData.players[i];
            const isMe = !!(
              currentUser &&
              (player.id === currentUser.id ||
                player.username === currentUser.username ||
                player.gdUsername === currentUser.gdUsername)
            );

            const [pLon, pLat] = getProvincePlayerOffset(province, i, playersCount, cam.zoom);
            const pt = fastProjectGround(pLon, pLat);
            if (!pt) continue;

            const displayName = player.displayName || player.gdUsername || player.username || '?';
            const zoomScale2D = cam.zoom < 6.0 ? 1.0 : Math.min(3.0, 1.0 + Math.pow((cam.zoom - 6.0) / 7.0, 0.65));
            const userTheme = isMe ? '#facc15' : getUserThemeColor(player);

            if (!show2DName) {
              const avSize = Math.round(22 * zoomScale2D);
              badges2D.push({
                player,
                provinceId: province.id,
                isMe,
                userTheme,
                originalPt: { x: pt.x, y: pt.y },
                x: pt.x,
                y: pt.y,
                badgeW: avSize,
                badgeH: avSize,
                avSize,
                padX: 0,
                clanW: 0,
                clanText: '',
                nameW: 0,
                scoreW: 0,
                scoreText: '',
                displayName,
                fontInfo: null,
                show2DName: false,
                zoomScale2D,
              });
            } else {
              const avSize = Math.round(18 * zoomScale2D);
              const clanTag = player.clanTag || player.clan?.tag;
              const clanText = clanTag ? `[${clanTag}] ` : '';

              ctx.save();
              ctx.font = `bold ${Math.round(9 * zoomScale2D)}px monospace`;
              const clanW = clanText ? ctx.measureText(clanText).width : 0;

              const baseFontSize = Math.round(10 * zoomScale2D);
              const fontInfo = getCanvasFont(player.nameFont, baseFontSize);
              ctx.font = fontInfo.font;
              const nameW = ctx.measureText(displayName).width;

              let scoreText = '';
              let scoreW = 0;
              if (currentMode !== 'POPULATION') {
                const scoreVal = Math.round(
                  player.score ??
                    player.classicPp ??
                    player.platformerPp ??
                    player.challengePp ??
                    player.creatorPoints ??
                    player.statValue ??
                    player.gdStars ??
                    player.activityPoints ??
                    0
                );
                scoreText = ` • ${scoreVal.toLocaleString()}`;
                ctx.font = `bold ${Math.round(9 * zoomScale2D)}px sans-serif`;
                scoreW = ctx.measureText(scoreText).width;
              }
              ctx.restore();

              const padX = Math.round(5 * zoomScale2D);
              const badgeW = avSize + padX * 2 + clanW + nameW + scoreW + 4;
              const badgeH = Math.round(22 * zoomScale2D);

              badges2D.push({
                player,
                provinceId: province.id,
                isMe,
                userTheme,
                originalPt: { x: pt.x, y: pt.y },
                x: pt.x,
                y: pt.y,
                badgeW,
                badgeH,
                avSize,
                padX,
                clanW,
                clanText,
                nameW,
                scoreW,
                scoreText,
                displayName,
                fontInfo,
                show2DName: true,
                zoomScale2D,
              });
            }
          }
        }

        // GIẢI QUYẾT VA CHẠM (Anti-Overlap Collision Resolution):
        // Nhóm các badge theo tỉnh, nếu các badge nằm đè lên nhau sẽ tự động tách theo trục Y và so le
        const badgesByProvince: Record<string, Badge2DItem[]> = {};
        for (const b of badges2D) {
          if (!badgesByProvince[b.provinceId]) {
            badgesByProvince[b.provinceId] = [];
          }
          badgesByProvince[b.provinceId].push(b);
        }

        for (const provId in badgesByProvince) {
          const list = badgesByProvince[provId];
          if (list.length <= 1) continue;

          // Sắp xếp các badge trong tỉnh theo toạ độ Y gốc
          list.sort((a, b) => a.originalPt.y - b.originalPt.y);

          for (let i = 1; i < list.length; i++) {
            const cur = list[i];
            for (let j = 0; j < i; j++) {
              const prev = list[j];
              const dx = cur.x - prev.x;
              const dy = cur.y - prev.y;
              const minGapX = (cur.badgeW + prev.badgeW) / 2 + 6;
              const minGapY = (cur.badgeH + prev.badgeH) / 2 + 5;

              if (Math.abs(dx) < minGapX && Math.abs(dy) < minGapY) {
                // Đè nhau: Đẩy badge hiện tại xuống phía dưới để lộ trọn vẹn avatar, tên & clan
                cur.y = prev.y + minGapY;
                // Nếu trục X trùng nhau hoặc quá sát (< 16px), lệch nhẹ so le 12px
                if (Math.abs(dx) < 16) {
                  cur.x += (i % 2 === 1 ? 12 : -12);
                }
              }
            }
          }
        }

        // VẼ CÁC BADGE ĐÃ ĐƯỢC GIẢI QUYẾT VA CHẠM HOÀN HẢO
        ctx.save();
        ctx.globalAlpha = detailsFadeAlpha;

        for (const b of badges2D) {
          const {
            player,
            isMe,
            userTheme,
            originalPt,
            x,
            y,
            badgeW,
            badgeH,
            avSize,
            padX,
            clanW,
            clanText,
            nameW,
            scoreText,
            displayName,
            fontInfo,
            show2DName: itemShowName,
            zoomScale2D,
          } = b;

          const badgeX = x - badgeW / 2;
          const badgeY = y - badgeH / 2;

          // Nếu badge bị dịch chuyển khỏi vị trí địa lý gốc để tránh đè chữ:
          // Vẽ chân định vị nhỏ tại originalPt kèm đường line mảnh nối tới mép badge
          const distFromOrigin = Math.hypot(x - originalPt.x, y - originalPt.y);
          if (distFromOrigin > 7) {
            ctx.save();
            ctx.fillStyle = userTheme;
            ctx.beginPath();
            ctx.arc(originalPt.x, originalPt.y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = userTheme;
            ctx.globalAlpha = detailsFadeAlpha * 0.45;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(originalPt.x, originalPt.y);
            ctx.lineTo(badgeX + (x >= originalPt.x ? 0 : badgeW), badgeY + badgeH / 2);
            ctx.stroke();
            ctx.restore();
          }

          if (!itemShowName) {
            // MỨC 1 (Chỉ hiển thị Avatar)
            const avX = badgeX;
            const avY = badgeY;

            ctx.save();
            if (player.avatarUrl) {
              const img = getAvatarImg(player.avatarUrl);
              if (img) {
                ctx.beginPath();
                ctx.roundRect(avX, avY, avSize, avSize, Math.max(4, 5 * zoomScale2D));
                ctx.clip();
                ctx.drawImage(img, avX, avY, avSize, avSize);
              } else {
                ctx.fillStyle = isMe ? '#f59e0b' : themeAccent;
                ctx.beginPath();
                ctx.roundRect(avX, avY, avSize, avSize, Math.max(4, 5 * zoomScale2D));
                ctx.fill();
              }
            } else {
              ctx.fillStyle = isMe ? '#f59e0b' : themeAccent;
              ctx.beginPath();
              ctx.roundRect(avX, avY, avSize, avSize, Math.max(4, 5 * zoomScale2D));
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = `bold ${Math.round(10 * zoomScale2D)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(displayName.charAt(0).toUpperCase(), x, y);
            }
            ctx.restore();

            // Viền mỏng
            ctx.strokeStyle = isMe ? '#facc15' : 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = isMe ? 2 : 1;
            ctx.beginPath();
            ctx.roundRect(avX, avY, avSize, avSize, Math.max(4, 5 * zoomScale2D));
            ctx.stroke();
          } else {
            // MỨC 2, 3, 4: Khung Badge đầy đủ
            ctx.fillStyle = isDarkTheme ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)';
            ctx.strokeStyle = isMe ? '#facc15' : 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = isMe ? 1.8 : 1;
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, Math.max(4, 6 * zoomScale2D));
            ctx.fill();
            ctx.stroke();

            // Vẽ Avatar bên trái badge
            const avX = badgeX + padX;
            const avY = badgeY + (badgeH - avSize) / 2;
            if (player.avatarUrl) {
              const img = getAvatarImg(player.avatarUrl);
              if (img) {
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(avX, avY, avSize, avSize, Math.max(3, 4 * zoomScale2D));
                ctx.clip();
                ctx.drawImage(img, avX, avY, avSize, avSize);
                ctx.restore();
              } else {
                ctx.fillStyle = userTheme;
                ctx.beginPath();
                ctx.roundRect(avX, avY, avSize, avSize, Math.max(3, 4 * zoomScale2D));
                ctx.fill();
              }
            } else {
              ctx.fillStyle = userTheme;
              ctx.beginPath();
              ctx.roundRect(avX, avY, avSize, avSize, Math.max(3, 4 * zoomScale2D));
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = `bold ${Math.round(9 * zoomScale2D)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(displayName.charAt(0).toUpperCase(), avX + avSize / 2, avY + avSize / 2);
            }

            // Text: Clan Tag -> Tên theo font profile -> Điểm
            let curTextX = avX + avSize + 4;
            const textY = badgeY + badgeH / 2;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            if (clanText) {
              ctx.font = `bold ${Math.round(9 * zoomScale2D)}px monospace`;
              ctx.fillStyle = getCanvasGradientOrColor(
                ctx,
                player.clanGradient || player.clan?.colorGradient,
                player.clanColor || player.clan?.color,
                curTextX,
                textY,
                clanW,
                '#38bdf8'
              );
              ctx.fillText(clanText, curTextX, textY);
              curTextX += clanW;
            }

            if (fontInfo) {
              ctx.font = fontInfo.font;
            }
            const defaultNameCol = isMe ? '#fef08a' : (isDarkTheme ? '#ffffff' : '#0f172a');
            ctx.fillStyle = getCanvasGradientOrColor(
              ctx,
              player.nameGradient,
              player.nameColor,
              curTextX,
              textY,
              nameW,
              defaultNameCol
            );
            ctx.fillText(displayName, curTextX, textY);
            curTextX += nameW;

            if (scoreText) {
              ctx.fillStyle = isMe ? '#facc15' : themeAccent;
              ctx.font = `bold ${Math.round(9 * zoomScale2D)}px sans-serif`;
              ctx.fillText(scoreText, curTextX, textY);
            }
          }
        }
        ctx.restore();
        ctx.restore();
      }

      // Cập nhật hoạt ảnh alpha của các hiệu ứng tương tác (mượt mà fade out khi ngừng kéo)
      const isLeftDragging = isDraggingRef.current && dragButtonRef.current === 0;
      const isRightDragging = isDraggingRef.current && dragButtonRef.current === 2;

      leftDragAlphaRef.current += ((isLeftDragging ? 1.0 : 0.0) - leftDragAlphaRef.current) * 0.14;
      rightDragAlphaRef.current += ((isRightDragging ? 1.0 : 0.0) - rightDragAlphaRef.current) * 0.14;

      if (leftDragAlphaRef.current < 0.005) leftDragAlphaRef.current = 0;
      if (rightDragAlphaRef.current < 0.005) rightDragAlphaRef.current = 0;

      const cx = width / 2;
      const cy = height / 2;

      // 8a. Hiệu ứng Chuột Trái Di Chuyển (Pan): Tự động ẩn hoàn toàn khi không kéo chuột
      if (leftDragAlphaRef.current > 0.005) {
        ctx.save();
        // Hai đường chữ thập mỏng xuyên suốt màn hình
        ctx.globalAlpha = leftDragAlphaRef.current * 0.4;
        ctx.strokeStyle = themeAccent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, height);
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.stroke();

        // Dấu cộng ngắn gọn gàng ở trung tâm: Rút ngắn gọn, màu theme sáng hơn vạch mờ dài
        const crossLen = 8;
        ctx.globalAlpha = leftDragAlphaRef.current * 0.95;
        ctx.strokeStyle = mixRgb(rgbAccent, { r: 255, g: 255, b: 255 }, isDarkTheme ? 0.45 : 0.2);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - crossLen, cy);
        ctx.lineTo(cx + crossLen, cy);
        ctx.moveTo(cx, cy - crossLen);
        ctx.lineTo(cx, cy + crossLen);
        ctx.stroke();
        ctx.restore();
      }

      // 8b. Hiệu ứng Chuột Phải Nghiêng 3D & Xoay Dial: Mũi tên 2 đầu ↕ DÀI HƠN ở giữa, viền thanh dọc đồng hồ ở ngoài
      if (rightDragAlphaRef.current > 0.005) {
        ctx.save();
        ctx.globalAlpha = rightDragAlphaRef.current;

        const arrowHalfLen = 42;

        // Viền đen bóng sắc nét (thay thế shadowBlur)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy - arrowHalfLen);
        ctx.lineTo(cx, cy + arrowHalfLen);
        ctx.moveTo(cx - 8, cy - arrowHalfLen + 12);
        ctx.lineTo(cx, cy - arrowHalfLen);
        ctx.lineTo(cx + 8, cy - arrowHalfLen + 12);
        ctx.moveTo(cx - 8, cy + arrowHalfLen - 12);
        ctx.lineTo(cx, cy + arrowHalfLen);
        ctx.lineTo(cx + 8, cy + arrowHalfLen - 12);
        ctx.stroke();

        // Mũi tên trắng sắc nét
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - arrowHalfLen);
        ctx.lineTo(cx, cy + arrowHalfLen);
        ctx.moveTo(cx - 8, cy - arrowHalfLen + 12);
        ctx.lineTo(cx, cy - arrowHalfLen);
        ctx.lineTo(cx + 8, cy - arrowHalfLen + 12);
        ctx.moveTo(cx - 8, cy + arrowHalfLen - 12);
        ctx.lineTo(cx, cy + arrowHalfLen);
        ctx.lineTo(cx + 8, cy + arrowHalfLen - 12);
        ctx.stroke();

        // Viền ngoài khu vực xoay: các thanh dọc hướng vào tâm như vạch đồng hồ
        const dialRadius = Math.min(width, height) * 0.44;
        const tickCount = 60;
        for (let i = 0; i < tickCount; i++) {
          const isMajor = i % 5 === 0;
          const tickLen = isMajor ? 18 : 9;
          const rad = ((i / tickCount) * 360 + cam.yaw) * (Math.PI / 180);
          const cosR = Math.cos(rad);
          const sinR = Math.sin(rad);

          const xInner = cx + cosR * (dialRadius - tickLen);
          const yInner = cy + sinR * (dialRadius - tickLen);
          const xOuter = cx + cosR * dialRadius;
          const yOuter = cy + sinR * dialRadius;

          ctx.strokeStyle = isMajor ? '#ffffff' : themeAccent;
          ctx.lineWidth = isMajor ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(xInner, yInner);
          ctx.lineTo(xOuter, yOuter);
          ctx.stroke();
        }

        // Vòng cung viền nhẹ quanh các thanh vạch
        ctx.strokeStyle = themeAccent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, dialRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Nút tròn lớn trên vòng xoay (crisp layered circles thay cho shadowBlur 14)
        const dotRad = (-90 + cam.yaw) * (Math.PI / 180);
        const dotX = cx + Math.cos(dotRad) * dialRadius;
        const dotY = cy + Math.sin(dotRad) * dialRadius;
        ctx.save();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 7.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = themeAccent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 7.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = themeAccent;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.restore();
      }

      ctx.restore();

      // Throttled center crosshair sampling: only sample when camera moves or user is interacting
      const camMoved =
        Math.abs(cam.lon - lastSampledLonRef.current) > 0.0001 ||
        Math.abs(cam.lat - lastSampledLatRef.current) > 0.0001 ||
        Math.abs(cam.zoom - lastSampledZoomRef.current) > 0.002 ||
        Math.abs(cam.yaw - lastSampledYawRef.current) > 0.05 ||
        Math.abs(cam.pitch - lastSampledPitchRef.current) > 0.05 ||
        isDraggingRef.current;

      if (camMoved) {
        lastSampledLonRef.current = cam.lon;
        lastSampledLatRef.current = cam.lat;
        lastSampledZoomRef.current = cam.zoom;
        lastSampledYawRef.current = cam.yaw;
        lastSampledPitchRef.current = cam.pitch;

        const [centerLon, centerLat] = unproject(halfW, halfH, cam, width, height);
        const centerProv = getProvinceAtCoords(centerLon, centerLat);
        if (centerProv !== lastCenterProvRef.current) {
          lastCenterProvRef.current = centerProv;
          hoveredProvinceIdRef.current = centerProv;
          latestPropsRef.current.onHoverProvince?.(centerProv);
        }

        const last = lastReportedCamRef.current;
        if (
          !last ||
          Math.abs(cam.zoom - last.zoom) > 0.04 ||
          Math.abs(cam.yaw - last.yaw) > 0.4 ||
          Math.abs(cam.pitch - last.pitch) > 0.4
        ) {
          lastReportedCamRef.current = { zoom: cam.zoom, yaw: cam.yaw, pitch: cam.pitch };
          latestPropsRef.current.onCameraChange?.({ zoom: cam.zoom, yaw: cam.yaw, pitch: cam.pitch });
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [unproject, getAvatarImg, userProvinceId]);

  // Find province at screen position
  const getProvinceAtScreenPos = useCallback(
    (sx: number, sy: number): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const [lon, lat] = unproject(sx, sy, cameraRef.current, width, height);
      return getProvinceAtCoords(lon, lat);
    },
    [unproject]
  );

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragButtonRef.current = e.button;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedFarRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;

      if (Math.hypot(dx, dy) > 4) {
        hasDraggedFarRef.current = true;
      }

      if (dragButtonRef.current === 2) {
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const curX = sx;
        const curY = sy;
        const prevX = dragStartPosRef.current.x - rect.left;
        const prevY = dragStartPosRef.current.y - rect.top;

        const distFromCenter = Math.hypot(curX - cx, curY - cy);
        const rimThreshold = Math.min(rect.width, rect.height) * 0.28;

        if (distFromCenter > rimThreshold) {
          // Xoay như kim đồng hồ theo vòng tròn viền ngoài (Dial / Wheel Clock Rotation)
          const angle0 = Math.atan2(prevY - cy, prevX - cx);
          const angle1 = Math.atan2(curY - cy, curX - cx);
          let dAngle = angle1 - angle0;
          while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
          while (dAngle < -Math.PI) dAngle += 2 * Math.PI;

          const yawDelta = (dAngle * 180) / Math.PI;
          let newYaw = (cameraRef.current.targetYaw + yawDelta) % 360;
          if (newYaw < 0) newYaw += 360;
          cameraRef.current.yaw = newYaw;
          cameraRef.current.targetYaw = newYaw;
        } else {
          // Chuột phải kéo ở vùng giữa: Chỉnh pitch 3D (0° -> 80°), tốc độ mượt mà vừa phải
          const pitchDelta = -dy * 0.20;
          const newPitch = Math.max(0, Math.min(80, cameraRef.current.pitch + pitchDelta));
          cameraRef.current.pitch = newPitch;
          cameraRef.current.targetPitch = newPitch;
        }

        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      } else {
        // Chuột trái kéo: Pan map (có tính góc xoay yaw)
        const baseScale = 75 * cameraRef.current.zoom;
        const radYaw = (-cameraRef.current.yaw * Math.PI) / 180;
        const cosY = Math.cos(radYaw);
        const sinY = Math.sin(radYaw);

        const dLonRot = -dx / baseScale;
        const dLatRot = dy / baseScale;

        const dLon = dLonRot * cosY - dLatRot * sinY;
        const dLat = dLonRot * sinY + dLatRot * cosY;

        cameraRef.current.lon += dLon;
        cameraRef.current.lat += dLat;
        cameraRef.current.targetLon = cameraRef.current.lon;
        cameraRef.current.targetLat = cameraRef.current.lat;

        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      }
    }
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hasDraggedFarRef.current && dragButtonRef.current === 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const clickedProvince = getProvinceAtScreenPos(sx, sy);
        if (clickedProvince) {
          onSelectProvince(clickedProvince);
        } else {
          onSelectProvince(null);
        }
      }
    }
    isDraggingRef.current = false;
  };

  // Cuộn chuột zoom theo tâm crosshair (thay vì theo con trỏ chuột, giới hạn phóng to cực đại 50.0)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const oldZoom = cameraRef.current.targetZoom;
    const newZoom = Math.max(0.5, Math.min(50.0, oldZoom * zoomFactor));
    cameraRef.current.targetZoom = newZoom;
  };

  // Touch Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragStartPosRef.current = { x: t.clientX, y: t.clientY };
      hasDraggedFarRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      // 1 Finger: Tilt 3D
      const t = e.touches[0];
      const dy = t.clientY - dragStartPosRef.current.y;
      if (Math.abs(dy) > 4) hasDraggedFarRef.current = true;
      const pitchDelta = -dy * 0.4;
      const newPitch = Math.max(0, Math.min(80, cameraRef.current.pitch + pitchDelta));
      cameraRef.current.pitch = newPitch;
      cameraRef.current.targetPitch = newPitch;
      dragStartPosRef.current = { x: t.clientX, y: t.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    if (!hasDraggedFarRef.current && e.changedTouches.length === 1) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const t = e.changedTouches[0];
        const sx = t.clientX - rect.left;
        const sy = t.clientY - rect.top;
        const clickedProvince = getProvinceAtScreenPos(sx, sy);
        if (clickedProvince) {
          onSelectProvince(clickedProvince);
        } else {
          onSelectProvince(null);
        }
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      className="w-full h-full block cursor-grab active:cursor-grabbing touch-none select-none"
    />
  );
}

export const VietnamMapCanvas = React.memo(VietnamMapCanvasComponent);
