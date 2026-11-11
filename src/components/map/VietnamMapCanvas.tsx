'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  VIETNAM_PROVINCES_GEO,
  VIETNAM_TOTAL_BOUNDS,
  isPointInPolygon,
  ProvinceGeoFeature,
} from '@/lib/vietnamGeoData';
import { extractProvinceFromLocation } from '@/lib/location';

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
      }
    >;
  } | null;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string | null) => void;
  currentUser: any;
  currentMode: string;
  is3D: boolean;
  onToggle3D: () => void;
  onRequestSnapToUser: number;
}

interface CameraState {
  lon: number;
  lat: number;
  zoom: number;
  pitch: number; // 0 to 80 degrees
  targetLon: number;
  targetLat: number;
  targetZoom: number;
  targetPitch: number;
}

export function VietnamMapCanvas({
  mapData,
  selectedProvinceId,
  onSelectProvince,
  currentUser,
  currentMode,
  is3D,
  onToggle3D,
  onRequestSnapToUser,
}: VietnamMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera state
  const cameraRef = useRef<CameraState>({
    lon: 107.5,
    lat: 16.0,
    zoom: 1.0,
    pitch: 0,
    targetLon: 107.5,
    targetLat: 16.0,
    targetZoom: 1.0,
    targetPitch: 0,
  });

  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragButtonRef = useRef<number>(0); // 0 = left, 2 = right
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedFarRef = useRef(false);

  // Touch tracking
  const touchesRef = useRef<Array<{ x: number; y: number }>>([]);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1.0);

  // User's province
  const userProvinceId = React.useMemo(() => {
    if (!currentUser?.country) return null;
    return extractProvinceFromLocation(currentUser.country);
  }, [currentUser]);

  // Initial animation: Fly to user province or center of VN
  useEffect(() => {
    if (userProvinceId) {
      const p = VIETNAM_PROVINCES_GEO.find((item) => item.id === userProvinceId);
      if (p) {
        cameraRef.current.targetLon = p.center[0];
        cameraRef.current.targetLat = p.center[1];
        cameraRef.current.targetZoom = 3.5;
        return;
      }
    }
    // Default overview
    cameraRef.current.targetLon = 107.5;
    cameraRef.current.targetLat = 16.0;
    cameraRef.current.targetZoom = 1.1;
  }, [userProvinceId]);

  // Snap to user when compass button clicked
  useEffect(() => {
    if (onRequestSnapToUser === 0) return;
    if (userProvinceId) {
      const p = VIETNAM_PROVINCES_GEO.find((item) => item.id === userProvinceId);
      if (p) {
        cameraRef.current.targetLon = p.center[0];
        cameraRef.current.targetLat = p.center[1];
        cameraRef.current.targetZoom = 4.2;
        return;
      }
    }
    // Fallback to overview
    cameraRef.current.targetLon = 107.5;
    cameraRef.current.targetLat = 16.0;
    cameraRef.current.targetZoom = 1.1;
    cameraRef.current.targetPitch = 0;
  }, [onRequestSnapToUser, userProvinceId]);

  // Handle 3D prop toggle
  useEffect(() => {
    cameraRef.current.targetPitch = is3D ? 65 : 0;
  }, [is3D]);

  // Fly to selected province when selected from outside
  useEffect(() => {
    if (!selectedProvinceId) return;
    const p = VIETNAM_PROVINCES_GEO.find((item) => item.id === selectedProvinceId);
    if (p) {
      cameraRef.current.targetLon = p.center[0];
      cameraRef.current.targetLat = p.center[1];
      cameraRef.current.targetZoom = Math.max(cameraRef.current.zoom, 4.5);
    }
  }, [selectedProvinceId]);

  // Coordinate projection helper
  const project = useCallback(
    (
      lon: number,
      lat: number,
      heightZ: number,
      cam: CameraState,
      width: number,
      height: number
    ): { x: number; y: number; visible: boolean; scale: number } => {
      // Base scale: 1 degree approx 75px at zoom 1.0
      const baseScale = 75 * cam.zoom;
      const wx = (lon - cam.lon) * baseScale;
      const wy = -(lat - cam.lat) * baseScale; // North is -wy, South is +wy

      const radPitch = (cam.pitch * Math.PI) / 180;
      const sinP = Math.sin(radPitch);
      const cosP = Math.cos(radPitch);

      // Camera positioned south, tilted forward looking north
      // Y goes south (+), north is (-).
      // Distance forward from camera target:
      const focal = 900;
      // North points (wy < 0) are farther away
      const distFromCam = focal - wy * sinP + heightZ * cosP;
      if (distFromCam < 50) {
        return { x: 0, y: 0, visible: false, scale: 0 };
      }

      const projScale = focal / distFromCam;
      const yRot = wy * cosP - heightZ * sinP;

      const screenX = width / 2 + wx * projScale;
      // Vertical tilt adjustment
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
      // yRot * projScale = targetScreenY
      // (wy * cosP) * (focal / (focal - wy * sinP)) = targetScreenY
      // wy * cosP * focal = targetScreenY * (focal - wy * sinP)
      // wy * (cosP * focal + targetScreenY * sinP) = targetScreenY * focal
      const denom = cosP * focal + targetScreenY * sinP;
      const wy = denom !== 0 ? (targetScreenY * focal) / denom : 0;

      const dist = Math.max(50, focal - wy * sinP);
      const projScale = focal / dist;

      const wx = (sx - width / 2) / projScale;

      const lon = cam.lon + wx / baseScale;
      const lat = cam.lat - wy / baseScale;

      return [lon, lat];
    },
    []
  );

  // Render loop
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
      cam.lon += (cam.targetLon - cam.lon) * 0.1;
      cam.lat += (cam.targetLat - cam.lat) * 0.1;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.1;
      cam.pitch += (cam.targetPitch - cam.pitch) * 0.1;

      // Handle canvas resize
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

      const pitchNorm = cam.pitch / 80; // 0 to 1

      // 1. Synthwave Background in 3D Mode
      if (pitchNorm > 0.02) {
        // Deep Cosmos Sky
        const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
        skyGradient.addColorStop(0, `rgba(4, 7, 20, ${pitchNorm})`);
        skyGradient.addColorStop(0.35, `rgba(26, 10, 52, ${pitchNorm * 0.95})`);
        skyGradient.addColorStop(0.65, `rgba(45, 12, 60, ${pitchNorm * 0.7})`);
        skyGradient.addColorStop(1, `rgba(10, 15, 30, ${pitchNorm * 0.5})`);
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height);

        // Synthwave Horizon Sun
        const sunRadius = Math.min(width, height) * 0.22;
        const sunX = width / 2;
        const sunY = height * 0.32 - pitchNorm * 20;

        // Outer Glow
        const glowGradient = ctx.createRadialGradient(
          sunX,
          sunY,
          sunRadius * 0.2,
          sunX,
          sunY,
          sunRadius * 2.2
        );
        glowGradient.addColorStop(0, `rgba(244, 63, 94, ${0.45 * pitchNorm})`);
        glowGradient.addColorStop(0.4, `rgba(168, 85, 247, ${0.25 * pitchNorm})`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Synthwave Sun Body with Stripes
        ctx.save();
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.clip();

        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#fde047'); // Bright Yellow
        sunGrad.addColorStop(0.4, '#fb923c'); // Orange
        sunGrad.addColorStop(1, '#ec4899'); // Neon Pink
        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunX - sunRadius, sunY - sunRadius, sunRadius * 2, sunRadius * 2);

        // Horizontal Synthwave Cut Stripes (thicker towards bottom)
        const stripeCount = 9;
        ctx.fillStyle = `rgba(15, 10, 30, ${0.9 * pitchNorm})`;
        for (let i = 0; i < stripeCount; i++) {
          const ratio = (i + 1) / (stripeCount + 1);
          const stripeY = sunY - sunRadius * 0.2 + ratio * (sunRadius * 1.2);
          const stripeHeight = 2.5 + Math.pow(ratio, 2) * 8;
          ctx.fillRect(sunX - sunRadius, stripeY, sunRadius * 2, stripeHeight);
        }
        ctx.restore();

        // Neon Floor Horizon Grid
        ctx.save();
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 * pitchNorm})`;
        ctx.lineWidth = 1;
        const gridHorizonY = sunY + sunRadius * 0.75;
        // Horizontal grid lines
        for (let y = gridHorizonY; y < height; y += (y - gridHorizonY) * 0.22 + 6) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        // Perspective rays radiating from sun center
        const rayCount = 18;
        for (let i = 0; i <= rayCount; i++) {
          const rayX = (width / rayCount) * i;
          ctx.beginPath();
          ctx.moveTo(sunX, sunY + sunRadius * 0.4);
          ctx.lineTo(rayX, height);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Draw Provinces (Polygons & Choropleth)
      const top1 = mapData?.top1Province;
      const top2 = mapData?.top2Province;
      const top3 = mapData?.top3Province;
      const maxScore = mapData?.maxScore || 1;

      VIETNAM_PROVINCES_GEO.forEach((province) => {
        const isHovered = hoveredProvinceId === province.id;
        const isSelected = selectedProvinceId === province.id;
        const isUserProvince = userProvinceId === province.id;

        const pData = mapData?.provinces[province.id];
        const score = pData?.totalScore || 0;
        const scoreRatio = maxScore > 0 ? Math.min(1, score / maxScore) : 0;

        const isRank1 = top1 === province.id;
        const isRank2 = top2 === province.id;
        const isRank3 = top3 === province.id;

        province.polygons.forEach((poly) => {
          ctx.beginPath();
          let hasFirst = false;

          poly.forEach(([lon, lat]) => {
            const pt = project(lon, lat, 0, cam, width, height);
            if (!pt.visible) return;
            if (!hasFirst) {
              ctx.moveTo(pt.x, pt.y);
              hasFirst = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          });

          ctx.closePath();

          // Fill styling
          if (score === 0) {
            ctx.fillStyle = isHovered
              ? 'rgba(56, 189, 248, 0.12)'
              : 'rgba(30, 41, 59, 0.35)';
          } else {
            // Brighten with scoreRatio
            const alpha = 0.25 + scoreRatio * 0.55;
            if (isRank1) {
              ctx.fillStyle = `rgba(234, 179, 8, ${alpha})`;
            } else if (isRank2) {
              ctx.fillStyle = `rgba(203, 213, 225, ${alpha * 0.9})`;
            } else if (isRank3) {
              ctx.fillStyle = `rgba(217, 119, 6, ${alpha * 0.9})`;
            } else {
              // Accent cyan/indigo shade
              ctx.fillStyle = `rgba(14, 165, 233, ${alpha * 0.8})`;
            }
          }
          ctx.fill();

          // Border styling
          if (isUserProvince) {
            // Pulsing luminous border for user's home province
            const pulse = 0.5 + 0.5 * Math.sin(pulsePhase * 2);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.8 + 0.2 * pulse})`;
            ctx.lineWidth = 3 + pulse * 1.5;
            ctx.stroke();
          } else if (isRank1) {
            ctx.strokeStyle = '#facc15'; // Gold
            ctx.lineWidth = 3;
            ctx.stroke();
          } else if (isRank2) {
            ctx.strokeStyle = '#cbd5e1'; // Silver
            ctx.lineWidth = 2.4;
            ctx.stroke();
          } else if (isRank3) {
            ctx.strokeStyle = '#d97706'; // Bronze
            ctx.lineWidth = 2.4;
            ctx.stroke();
          } else if (isSelected || isHovered) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      // 3. 3D Skyscraper City Mode (when pitch > 15°)
      if (cam.pitch > 12) {
        // Collect players in provinces
        const buildingsToRender: Array<{
          x: number;
          y: number;
          lon: number;
          lat: number;
          height: number;
          player: any;
          isCurrentUser: boolean;
          provinceName: string;
          rankInProvince: number;
        }> = [];

        VIETNAM_PROVINCES_GEO.forEach((province) => {
          const pData = mapData?.provinces[province.id];
          if (!pData || !pData.players || pData.players.length === 0) return;

          // Render top players as skyscrapers
          const maxPlayersToShow = Math.min(pData.players.length, 5);
          for (let i = 0; i < maxPlayersToShow; i++) {
            const player = pData.players[i];
            const isMe =
              currentUser &&
              (player.id === currentUser.id ||
                player.username === currentUser.username ||
                player.gdUsername === currentUser.gdUsername);

            // Slightly displace buildings around province center so each stands on its own plot
            const angle = (i / maxPlayersToShow) * Math.PI * 2;
            const distDeg = 0.08 + (i > 0 ? 0.06 : 0);
            const bLon = province.center[0] + Math.cos(angle) * distDeg;
            const bLat = province.center[1] + Math.sin(angle) * distDeg;

            // Height based on rank and score
            const rankHeightFactor = 1 - i / Math.max(1, maxPlayersToShow);
            const buildingH =
              (35 + rankHeightFactor * 130 + (isMe ? 30 : 0)) * pitchNorm;

            buildingsToRender.push({
              x: 0,
              y: 0,
              lon: bLon,
              lat: bLat,
              height: buildingH,
              player,
              isCurrentUser: !!isMe,
              provinceName: province.id,
              rankInProvince: i + 1,
            });
          }
        });

        // Sort buildings from North to South (back to front) for correct painter's depth
        buildingsToRender.sort((a, b) => b.lat - a.lat);

        // Render each building
        buildingsToRender.forEach((b) => {
          const basePt = project(b.lon, b.lat, 0, cam, width, height);
          const topPt = project(b.lon, b.lat, b.height, cam, width, height);
          if (!basePt.visible || !topPt.visible) return;

          const colW = Math.max(6, 14 * topPt.scale);

          // Perspective lighting: taller & farther pillars glow brighter
          const isMe = b.isCurrentUser;
          const isTop1 = b.rankInProvince === 1;

          // Front Face
          const frontGrad = ctx.createLinearGradient(
            topPt.x,
            topPt.y,
            basePt.x,
            basePt.y
          );
          if (isMe) {
            frontGrad.addColorStop(0, '#facc15');
            frontGrad.addColorStop(1, '#78350f');
          } else if (isTop1) {
            frontGrad.addColorStop(0, '#38bdf8');
            frontGrad.addColorStop(1, '#0c4a6e');
          } else {
            frontGrad.addColorStop(0, '#a855f7');
            frontGrad.addColorStop(1, '#3b0764');
          }

          ctx.fillStyle = frontGrad;
          ctx.beginPath();
          ctx.moveTo(topPt.x - colW / 2, topPt.y);
          ctx.lineTo(topPt.x + colW / 2, topPt.y);
          ctx.lineTo(basePt.x + colW / 2, basePt.y);
          ctx.lineTo(basePt.x - colW / 2, basePt.y);
          ctx.closePath();
          ctx.fill();

          // Column edge neon stroke
          ctx.strokeStyle = isMe
            ? '#fef08a'
            : isTop1
            ? '#7dd3fc'
            : 'rgba(216, 180, 254, 0.7)';
          ctx.lineWidth = isMe ? 2 : 1;
          ctx.stroke();

          // Beacon beam shooting to sky for current user
          if (isMe) {
            ctx.save();
            const beamGrad = ctx.createLinearGradient(
              topPt.x,
              topPt.y,
              topPt.x,
              topPt.y - 120
            );
            beamGrad.addColorStop(0, 'rgba(250, 204, 21, 0.85)');
            beamGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
            ctx.fillStyle = beamGrad;
            ctx.fillRect(topPt.x - 2, topPt.y - 120, 4, 120);
            ctx.restore();
          }

          // Top Roof Card (Avatar, Name, Score)
          if (cam.zoom > 1.8 || isMe || isTop1) {
            ctx.save();
            const badgeY = topPt.y - 18;
            const displayName =
              b.player.displayName || b.player.gdUsername || b.player.username || '?';
            const scoreVal = Math.round(
              b.player.classicPp ||
                b.player.platformerPp ||
                b.player.challengePp ||
                b.player.creatorPoints ||
                b.player.statValue ||
                b.player.gdStars ||
                b.player.activityPoints ||
                0
            );

            const badgeText = `${displayName} • ${scoreVal.toLocaleString()}`;
            ctx.font = 'bold 10px sans-serif';
            const metrics = ctx.measureText(badgeText);
            const badgeW = metrics.width + 16;
            const badgeH = 18;

            // Badge Background
            ctx.fillStyle = isMe
              ? 'rgba(120, 53, 15, 0.95)'
              : 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = isMe ? '#facc15' : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(
              topPt.x - badgeW / 2,
              badgeY - badgeH / 2,
              badgeW,
              badgeH,
              6
            );
            ctx.fill();
            ctx.stroke();

            // Text
            ctx.fillStyle = isMe ? '#fef08a' : '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, topPt.x, badgeY);

            ctx.restore();
          }
        });
      }

      // 4. Zoom LOD Overlays (Medium & Near Zoom)
      VIETNAM_PROVINCES_GEO.forEach((province) => {
        const centerPt = project(
          province.center[0],
          province.center[1],
          0,
          cam,
          width,
          height
        );
        if (!centerPt.visible) return;

        const pData = mapData?.provinces[province.id];
        if (!pData) return;

        // LOD 2: Show percentage inside province polygon if space permits
        if (cam.zoom >= 1.7 && cam.zoom < 4.0 && cam.pitch <= 25) {
          if (pData.percent > 0) {
            ctx.save();
            const percentText = `${pData.percent}%`;
            ctx.font = 'bold 11px sans-serif';
            const tm = ctx.measureText(percentText);
            const pillW = tm.width + 12;
            const pillH = 18;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(
              centerPt.x - pillW / 2,
              centerPt.y - pillH / 2,
              pillW,
              pillH,
              9
            );
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(percentText, centerPt.x, centerPt.y);
            ctx.restore();
          }
        }

        // LOD 3: Near zoom (zoom >= 4.0 in 2D mode): Show Top 1 player badge
        if (cam.zoom >= 4.0 && cam.pitch <= 25 && pData.topPlayer) {
          ctx.save();
          const top = pData.topPlayer;
          const name = top.displayName || top.gdUsername || top.username || '?';
          const score = Math.round(
            top.classicPp ||
              top.platformerPp ||
              top.challengePp ||
              top.creatorPoints ||
              top.statValue ||
              top.gdStars ||
              top.activityPoints ||
              0
          );

          // Card showing avatar initial + score (no unit, no leaderboard name)
          const badgeText = `${name} (${score.toLocaleString()})`;
          ctx.font = 'bold 11px sans-serif';
          const tm = ctx.measureText(badgeText);
          const badgeW = tm.width + 24;
          const badgeH = 22;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(
            centerPt.x - badgeW / 2,
            centerPt.y - badgeH / 2,
            badgeW,
            badgeH,
            11
          );
          ctx.fill();
          ctx.stroke();

          // Crown icon indicator
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(centerPt.x - badgeW / 2 + 10, centerPt.y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, centerPt.x + 4, centerPt.y);
          ctx.restore();
        }
      });

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [mapData, selectedProvinceId, hoveredProvinceId, userProvinceId, currentUser, project]);

  // Find province at screen position
  const getProvinceAtScreenPos = useCallback(
    (sx: number, sy: number): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      const [lon, lat] = unproject(sx, sy, cameraRef.current, width, height);

      for (const province of VIETNAM_PROVINCES_GEO) {
        // Fast bounding box check
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
        // Right click drag: Adjust 3D Camera pitch (0° to 80°)
        const pitchDelta = -dy * 0.45;
        const newPitch = Math.max(0, Math.min(80, cameraRef.current.pitch + pitchDelta));
        cameraRef.current.pitch = newPitch;
        cameraRef.current.targetPitch = newPitch;
        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      } else {
        // Left click drag: Pan map
        const baseScale = 75 * cameraRef.current.zoom;
        const dLon = -dx / baseScale;
        const dLat = dy / baseScale;

        cameraRef.current.lon += dLon;
        cameraRef.current.lat += dLat;
        cameraRef.current.targetLon = cameraRef.current.lon;
        cameraRef.current.targetLat = cameraRef.current.lat;

        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      }
    } else {
      // Hover detection
      const hovered = getProvinceAtScreenPos(sx, sy);
      setHoveredProvinceId(hovered);
    }
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

  // Wheel Handler: Zoom focused on mouse cursor
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const oldZoom = cameraRef.current.targetZoom;
    const newZoom = Math.max(0.6, Math.min(12.0, oldZoom * zoomFactor));

    // World pos under cursor before zoom
    const [worldLon, worldLat] = unproject(
      sx,
      sy,
      cameraRef.current,
      canvas.clientWidth,
      canvas.clientHeight
    );

    cameraRef.current.targetZoom = newZoom;

    // Adjust camera target so cursor remains over same geographic point
    cameraRef.current.targetLon += (worldLon - cameraRef.current.targetLon) * (1 - 1 / zoomFactor);
    cameraRef.current.targetLat += (worldLat - cameraRef.current.targetLat) * (1 - 1 / zoomFactor);
  };

  // Touch Handlers for Mobile (1 finger: 3D tilt, 2 fingers: pan & pinch zoom)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragStartPosRef.current = { x: t.clientX, y: t.clientY };
      hasDraggedFarRef.current = false;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = cameraRef.current.zoom;
      dragStartPosRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 1) {
      // 1 Finger: Tilt 3D camera angle (0° to 80°)
      const t = e.touches[0];
      const dy = t.clientY - dragStartPosRef.current.y;
      if (Math.abs(dy) > 4) {
        hasDraggedFarRef.current = true;
      }
      const pitchDelta = -dy * 0.45;
      const newPitch = Math.max(0, Math.min(80, cameraRef.current.pitch + pitchDelta));
      cameraRef.current.pitch = newPitch;
      cameraRef.current.targetPitch = newPitch;
      dragStartPosRef.current = { x: t.clientX, y: t.clientY };
    } else if (e.touches.length === 2) {
      // 2 Fingers: Zoom & Pan
      hasDraggedFarRef.current = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (initialPinchDistRef.current) {
        const factor = dist / initialPinchDistRef.current;
        const newZoom = Math.max(0.6, Math.min(12.0, initialPinchZoomRef.current * factor));
        cameraRef.current.zoom = newZoom;
        cameraRef.current.targetZoom = newZoom;
      }

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - dragStartPosRef.current.x;
      const dy = midY - dragStartPosRef.current.y;

      const baseScale = 75 * cameraRef.current.zoom;
      cameraRef.current.lon -= dx / baseScale;
      cameraRef.current.lat += dy / baseScale;
      cameraRef.current.targetLon = cameraRef.current.lon;
      cameraRef.current.targetLat = cameraRef.current.lat;

      dragStartPosRef.current = { x: midX, y: midY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
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
    initialPinchDistRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      className="w-full h-full block cursor-grab active:cursor-grabbing touch-none select-none"
    />
  );
}
