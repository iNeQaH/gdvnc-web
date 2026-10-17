'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, ShieldCheck } from 'lucide-react';

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
  ornate: { label: 'Rasley Heights', family: "'Rasley Heights', cursive", weight: '400', scale: 0.74 },
  rasley: { label: 'Rasley Heights', family: "'Rasley Heights', cursive", weight: '400', scale: 0.74 },
  horror: { label: "Coraline's Cat", family: "\"Coraline's Cat\", cursive", weight: '400', scale: 0.76 },
  coraline: { label: "Coraline's Cat", family: "\"Coraline's Cat\", cursive", weight: '400', scale: 0.76 },
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
  ornate: { label: 'Rasley Heights', family: "'Rasley Heights', cursive", weight: '400', scale: 0.74 },
  horror: { label: "Coraline's Cat", family: "\"Coraline's Cat\", cursive", weight: '400', scale: 0.76 },
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
    } | null;
    clanMember?: {
      role?: string | null;
      clan?: {
        tag?: string | null;
        color?: string | null;
        colorGradient?: string | null;
        slug?: string | null;
        isSuspended?: boolean | null;
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
}

export function UserDisplayName({
  user,
  fallbackName = '?',
  showClanTag = true,
  linkClan = false,
  clanRole,
  showClanRole = true,
  className = '',
  tagClassName = '',
  tagPosition = 'left',
}: UserDisplayNameProps) {
  const name = user?.displayName || user?.gdUsername || user?.username || fallbackName;

  // Trích xuất Clan từ user hoặc user.clanMember
  const clan = user?.clan || user?.clanMember?.clan;
  const isClanActive = clan && !clan.isSuspended && Boolean(clan.tag);
  const role = clanRole || user?.clanMember?.role;

  // Style cho Tag Clan (hoàn toàn cô lập, chỉ áp dụng cho tag [TAG], không ảnh hưởng tên)
  const clanTagStyle: React.CSSProperties = {
    display: 'inline-block',
  };
  if (clan?.colorGradient) {
    clanTagStyle.backgroundImage = clan.colorGradient;
    clanTagStyle.WebkitBackgroundClip = 'text';
    clanTagStyle.WebkitTextFillColor = 'transparent';
  } else if (clan?.color) {
    clanTagStyle.color = clan.color;
    clanTagStyle.WebkitTextFillColor = 'initial';
  }

  // Helper tính toán Drop-shadow Glow (hỗ trợ cả đơn sắc lẫn 2 màu gradient kèm góc xoay)
  const getGlowFilter = (glow: string) => {
    const gradMatch = glow.match(
      /linear-gradient\s*\(\s*(\d+)deg\s*,\s*(#[a-fA-F0-9]{3,8}|[^\s,]+)\s*,\s*(#[a-fA-F0-9]{3,8}|[^\s,]+)\s*\)/i
    );
    if (gradMatch) {
      const angle = parseInt(gradMatch[1], 10) || 135;
      const col1 = gradMatch[2].trim();
      const col2 = gradMatch[3].trim();
      const rad = (angle * Math.PI) / 180;
      const ox = Math.round(Math.sin(rad) * 4);
      const oy = Math.round(-Math.cos(rad) * 4);
      return `drop-shadow(${ox}px ${oy}px 4px ${col2}) drop-shadow(${-ox}px ${-oy}px 4px ${col1}) drop-shadow(0 0 6px ${col1}88)`;
    }
    return `drop-shadow(0 0 3px ${glow}) drop-shadow(0 0 6px ${glow}88)`;
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
      nameStyle.filter = getGlowFilter(user.nameGlow);
    }
  } else if (user?.nameColor) {
    nameStyle.color = user.nameColor;
    nameStyle.WebkitTextFillColor = 'initial';
    if (user?.nameGlow) {
      nameStyle.filter = getGlowFilter(user.nameGlow);
    }
  } else {
    nameStyle.WebkitTextFillColor = 'initial';
    if (user?.nameGlow) {
      nameStyle.filter = getGlowFilter(user.nameGlow);
    }
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
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {tagPosition === 'left' && renderTag()}
      <span style={nameStyle} className="font-bold">
        {name}
      </span>
      {tagPosition === 'right' && renderTag()}
      {renderRoleIcon()}
    </span>
  );
}
