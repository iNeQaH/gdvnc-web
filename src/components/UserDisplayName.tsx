'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

function hexToRgba(color: string, alpha: number): string {
  if (!color) return `rgba(245, 158, 11, ${alpha})`;
  const trimmed = color.trim();
  if (trimmed.startsWith('rgba') || trimmed.startsWith('hsla')) return trimmed;
  const m = trimmed.match(/^#?([0-9a-fA-F]{3,8})$/);
  if (!m) return trimmed;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
  return `rgba(245, 158, 11, ${alpha})`;
}

export const FONT_PRESETS: Record<string, { label: string; family: string; weight?: string; scale?: number }> = {
  default: { label: 'Mặc định', family: 'inherit', weight: '700', scale: 1 },
  pusab: { label: 'Pusab', family: "'Pusab', sans-serif", weight: '400', scale: 1.25 },
  pixel: { label: 'Press Start 2P', family: "'Press Start 2P', monospace", weight: '400', scale: 0.92 },
  glitch: { label: 'Katto', family: "'Katto', display, cursive", weight: '400', scale: 1.38 },
  katto: { label: 'Katto', family: "'Katto', display, cursive", weight: '400', scale: 1.38 },
  stencil: { label: 'Black Ops One', family: "'Black Ops One', display", weight: '400', scale: 1.26 },
  graffiti: { label: 'Permanent Marker', family: "'Permanent Marker', cursive", weight: '400', scale: 1.26 },
  arcade: { label: 'Righteous', family: "'Righteous', display", weight: '400', scale: 1.05 },
  techno: { label: 'Audiowide', family: "'Audiowide', display", weight: '400', scale: 1.05 },
  gothic: { label: 'Cinzel Decorative', family: "'Cinzel Decorative', serif", weight: '700', scale: 1.05 },
  ornate: { label: 'Rasley Heights', family: "'Rasley Heights', cursive", weight: '400', scale: 0.70 },
  rasley: { label: 'Rasley Heights', family: "'Rasley Heights', cursive", weight: '400', scale: 0.70 },
  horror: { label: "Coraline's Cat", family: "\"Coraline's Cat\", cursive", weight: '400', scale: 0.60 },
  coraline: { label: "Coraline's Cat", family: "\"Coraline's Cat\", cursive", weight: '400', scale: 0.60 },
  neon: { label: 'Angels', family: "'Angels', display, sans-serif", weight: '400', scale: 1.08 },
  angels: { label: 'Angels', family: "'Angels', display, sans-serif", weight: '400', scale: 1.08 },
  terminal: { label: 'VT323', family: "'VT323', monospace", weight: '400', scale: 1.15 },
  orbitron: { label: 'Orbitron', family: "'Orbitron', sans-serif", weight: '800', scale: 1.0 },
  firacode: { label: 'Fira Code', family: "'Fira Code', monospace", weight: '700', scale: 1.0 },
  unbounded: { label: 'Unbounded', family: "'Unbounded', sans-serif", weight: '800', scale: 0.95 },
  exo2: { label: 'Exo 2', family: "'Exo 2', sans-serif", weight: '800', scale: 1.0 },
  outfit: { label: 'Outfit', family: "'Outfit', sans-serif", weight: '700', scale: 1.0 },
  montserrat: { label: 'Montserrat', family: "'Montserrat', sans-serif", weight: '800', scale: 1.0 },
};

export const SETTINGS_FONT_PRESETS: Record<string, { label: string; family: string; weight?: string; scale?: number }> = {
  default: { label: 'Mặc định', family: 'inherit', weight: '700', scale: 1 },
  pusab: { label: 'Pusab', family: "'Pusab', sans-serif", weight: '400', scale: 1.25 },
  pixel: { label: 'Press Start 2P', family: "'Press Start 2P', monospace", weight: '400', scale: 0.92 },
  glitch: { label: 'Katto', family: "'Katto', display, cursive", weight: '400', scale: 1.38 },
  neon: { label: 'Angels', family: "'Angels', display, sans-serif", weight: '400', scale: 1.08 },
  graffiti: { label: 'Permanent Marker', family: "'Permanent Marker', cursive", weight: '400', scale: 1.26 },
  stencil: { label: 'Black Ops One', family: "'Black Ops One', display", weight: '400', scale: 1.26 },
  ornate: { label: 'Rasley Heights', family: "'Rasley Heights', cursive", weight: '400', scale: 0.70 },
  horror: { label: "Coraline's Cat", family: "\"Coraline's Cat\", cursive", weight: '400', scale: 0.60 },
};

export interface UserDisplayNameProps {
  user?: {
    username?: string | null;
    displayName?: string | null;
    gdUsername?: string | null;
    nameColor?: string | null;
    nameGradient?: string | null;
    nameGlow?: string | null;
    nameFont?: string | null;
    clan?: {
      tag?: string | null;
      color?: string | null;
      colorGradient?: string | null;
      slug?: string | null;
      isSuspended?: boolean | null;
      tier?: number;
    } | null;
    clanMember?: {
      role?: string | null;
      clan?: {
        tag?: string | null;
        color?: string | null;
        colorGradient?: string | null;
        slug?: string | null;
        isSuspended?: boolean | null;
        tier?: number;
      } | null;
    } | null;
  } | null;
  fallbackName?: string;
  showClanTag?: boolean;
  linkClan?: boolean;
  clanRole?: 'LEADER' | 'MODERATOR' | 'MEMBER' | string | null;
  showClanRole?: boolean;
  className?: string;
  tagClassName?: string;
  tagPosition?: 'left' | 'right';
  wrap?: boolean;
}

export function UserDisplayName({
  user,
  fallbackName = '?',
  showClanTag = true,
  linkClan = false,
  clanRole,
  showClanRole = false,
  className = '',
  tagClassName = '',
  tagPosition = 'left',
  wrap = true,
}: UserDisplayNameProps) {
  const name = user?.displayName || user?.gdUsername || user?.username || fallbackName;

  // Trích xuất Clan từ user hoặc user.clanMember
  const clan = user?.clan || user?.clanMember?.clan;
  const isClanActive = clan && !clan.isSuspended && Boolean(clan.tag);
  const role = clanRole || user?.clanMember?.role;

  let isDark = true;
  try {
    const themeCtx = useTheme();
    isDark = themeCtx.resolvedMode === 'dark';
  } catch {
    isDark = true;
  }

  // Style cho Tag Clan (hoàn toàn cô lập, chỉ áp dụng cho tag [TAG], không ảnh hưởng tên)
  const clanTagStyle: React.CSSProperties = {
    display: 'inline-block',
  };
  const isTagGradient = Boolean(clan?.colorGradient && (clan.tier === undefined || clan.tier >= 2));
  if (isTagGradient && clan?.colorGradient) {
    clanTagStyle.backgroundImage = clan.colorGradient;
    clanTagStyle.WebkitBackgroundClip = 'text';
    clanTagStyle.WebkitTextFillColor = 'transparent';
  } else if (clan?.color) {
    clanTagStyle.color = clan.color;
    clanTagStyle.WebkitTextFillColor = 'initial';
  }

  // Clan Tier 3+: nhẹ nhàng có hiệu ứng glow quanh tag clan theo màu clan
  const clanTierNum = (clan as any)?.tier ?? ((clan as any)?.totalSp !== undefined ? ((clan as any).totalSp >= 50 ? 4 : (clan as any).totalSp >= 20 ? 3 : (clan as any).totalSp >= 8 ? 2 : (clan as any).totalSp >= 3 ? 1 : 0) : 0);
  if (clanTierNum >= 3) {
    const glowBaseCol = clan?.color || '#38bdf8';
    clanTagStyle.filter = `drop-shadow(0 0 4px ${glowBaseCol}88)`;
  }

  // Helper tính toán Drop-shadow Glow (hỗ trợ cả đơn sắc lẫn 2 màu gradient kèm góc xoay và độ sáng/mờ opacity, tối ưu tương phản cả Dark & Light Mode)
  const getGlowFilter = (glow: string, dark: boolean) => {
    // Trích xuất metadata độ mờ/sáng opacity (nếu có, e.g. /*op:75*/ hoặc /*glow:1:70*/)
    let opacity = 100;
    const opMatch = glow.match(/\/\*(?:op|glow:\d+):(\d+)\*\//);
    if (opMatch) {
      opacity = Math.min(Math.max(parseInt(opMatch[1], 10) || 100, 10), 100);
    }
    const alphaMultiplier = opacity / 100;

    // Làm sạch chuỗi glow để parse màu sắc hoặc gradient
    const cleanGlow = glow.replace(/\/\*[\s\S]*?\*\//g, '').trim();

    const gradMatch = cleanGlow.match(
      /linear-gradient\s*\(\s*(\d+)deg\s*,\s*(#[a-fA-F0-9]{3,8}|[^\s,]+)\s*,\s*(#[a-fA-F0-9]{3,8}|[^\s,]+)\s*\)/i
    );
    if (gradMatch) {
      const angle = parseInt(gradMatch[1], 10) || 135;
      const col1 = gradMatch[2].trim();
      const col2 = gradMatch[3].trim();
      const rad = (angle * Math.PI) / 180;
      if (!dark) {
        // LIGHT MODE: Soft, airy, translucent ambient aura (chống bẩn / thâm đen viền chữ)
        const ox = Math.round(Math.sin(rad) * 3);
        const oy = Math.round(-Math.cos(rad) * 3);
        const a = 0.38 * alphaMultiplier;
        return `drop-shadow(${ox}px ${oy}px 6px ${hexToRgba(col2, a)}) drop-shadow(${-ox}px ${-oy}px 6px ${hexToRgba(col1, a)})`;
      }
      // DARK MODE: Rich vibrant neon glow
      const ox = Math.round(Math.sin(rad) * 4);
      const oy = Math.round(-Math.cos(rad) * 4);
      const a1 = 0.75 * alphaMultiplier;
      const a2 = 0.45 * alphaMultiplier;
      return `drop-shadow(${ox}px ${oy}px 4px ${hexToRgba(col2, a1)}) drop-shadow(${-ox}px ${-oy}px 4px ${hexToRgba(col1, a1)}) drop-shadow(0 0 8px ${hexToRgba(col1, a2)})`;
    }

    if (!dark) {
      const a = 0.38 * alphaMultiplier;
      return `drop-shadow(0 0 5px ${hexToRgba(cleanGlow, a)})`;
    }
    const a1 = 0.75 * alphaMultiplier;
    const a2 = 0.45 * alphaMultiplier;
    return `drop-shadow(0 0 3px ${hexToRgba(cleanGlow, a1)}) drop-shadow(0 0 7px ${hexToRgba(cleanGlow, a2)})`;
  };

  // Style cho Tên Supporter (bảo đảm độc lập 100% với màu Clan tag)
  const nameStyle: React.CSSProperties = {};
  if (user?.nameFont && FONT_PRESETS[user.nameFont]) {
    const preset = FONT_PRESETS[user.nameFont];
    if (preset.family) nameStyle.fontFamily = preset.family;
    if (preset.weight) nameStyle.fontWeight = preset.weight;
    if (preset.scale && preset.scale !== 1) {
      nameStyle.fontSize = `${preset.scale}em`;
    }
  }
  if (user?.nameGradient) {
    nameStyle.backgroundImage = user.nameGradient;
    nameStyle.WebkitBackgroundClip = 'text';
    nameStyle.WebkitTextFillColor = 'transparent';
    if (user?.nameGlow) {
      nameStyle.filter = getGlowFilter(user.nameGlow, isDark);
    }
  } else if (user?.nameColor) {
    nameStyle.color = user.nameColor;
    nameStyle.WebkitTextFillColor = 'initial';
    if (user?.nameGlow) {
      nameStyle.filter = getGlowFilter(user.nameGlow, isDark);
    }
  } else {
    nameStyle.WebkitTextFillColor = 'initial';
    if (user?.nameGlow) {
      nameStyle.filter = getGlowFilter(user.nameGlow, isDark);
    }
  }

  // Padding chống cắt góc chữ nghiêng / nét bay (đặc biệt là ký tự 'H' của font Angels và nét uốn Rasley/Coraline)
  if (user?.nameFont === 'neon' || user?.nameFont === 'angels') {
    nameStyle.paddingRight = '0.35em';
    nameStyle.display = 'inline-block';
  } else if (
    user?.nameFont === 'ornate' ||
    user?.nameFont === 'rasley' ||
    user?.nameFont === 'horror' ||
    user?.nameFont === 'coraline'
  ) {
    nameStyle.paddingRight = '0.15em';
    nameStyle.display = 'inline-block';
  }

  const renderTag = () => {
    if (!showClanTag || !isClanActive || !clan?.tag) return null;

    const content = (
      <span
        className={`inline-flex items-center font-mono font-black select-none tracking-normal shrink-0 ${tagClassName}`}
        title={`Clan [${clan.tag}]`}
      >
        <span style={clanTagStyle}>[{clan.tag}]</span>
      </span>
    );

    if (linkClan && clan.slug) {
      return (
        <Link
          href={`/clan/${clan.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="hover:opacity-80 transition-opacity inline-flex items-center align-middle"
        >
          {content}
        </Link>
      );
    }

    return content;
  };

  const renderRoleIcon = () => {
    if (!showClanRole) return null;
    if (role === 'LEADER') {
      return (
        <span title="Leader Clan" className="shrink-0 inline-flex items-center text-amber-400">
          <Crown className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (role === 'MODERATOR') {
      return (
        <span title="Quản trị viên Clan" className="shrink-0 inline-flex items-center text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
        </span>
      );
    }
    return null;
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${wrap ? 'flex-wrap' : 'flex-nowrap min-w-0'} ${className}`}>
      {tagPosition === 'left' && renderTag()}
      <span style={nameStyle} className={`font-bold ${wrap ? '' : 'truncate'}`}>
        {name}
      </span>
      {tagPosition === 'right' && renderTag()}
      {renderRoleIcon()}
    </span>
  );
}
