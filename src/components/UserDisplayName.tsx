'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, ShieldCheck } from 'lucide-react';

export const FONT_PRESETS: Record<string, { label: string; family: string; weight?: string }> = {
  default: { label: 'Mặc định (Inter)', family: 'inherit', weight: '700' },
  pixel: { label: 'Press Start (8-Bit Pixel)', family: "'Press Start 2P', monospace", weight: '400' },
  glitch: { label: 'Rubik Glitch (Cyber Glitch)', family: "'Rubik Glitch', display", weight: '400' },
  stencil: { label: 'Black Ops (Heavy Stencil)', family: "'Black Ops One', display", weight: '400' },
  graffiti: { label: 'Permanent Marker (Graffiti)', family: "'Permanent Marker', cursive", weight: '400' },
  arcade: { label: 'Righteous (Arcade Synth)', family: "'Righteous', display", weight: '400' },
  techno: { label: 'Audiowide (Techno Space)', family: "'Audiowide', display", weight: '400' },
  gothic: { label: 'Cinzel (Gothic Fantasy)', family: "'Cinzel Decorative', serif", weight: '700' },
  neon: { label: 'Monoton (Neon Lines)', family: "'Monoton', display", weight: '400' },
  terminal: { label: 'VT323 (CRT Terminal)', family: "'VT323', monospace", weight: '400' },
  orbitron: { label: 'Orbitron (Sci-Fi Cyber)', family: "'Orbitron', sans-serif", weight: '800' },
  firacode: { label: 'Fira Code (Tech Code)', family: "'Fira Code', monospace", weight: '700' },
  unbounded: { label: 'Unbounded (Heavy Bold)', family: "'Unbounded', sans-serif", weight: '800' },
  exo2: { label: 'Exo 2 (Esports)', family: "'Exo 2', sans-serif", weight: '800' },
  outfit: { label: 'Outfit (Geometria)', family: "'Outfit', sans-serif", weight: '700' },
  montserrat: { label: 'Montserrat (Clean)', family: "'Montserrat', sans-serif", weight: '800' },
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
  className?: string;
  tagClassName?: string;
}

export function UserDisplayName({
  user,
  fallbackName = '?',
  showClanTag = true,
  linkClan = false,
  clanRole,
  className = '',
  tagClassName = '',
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

  // Style cho Tên Supporter (bảo đảm độc lập 100% với màu Clan tag)
  const nameStyle: React.CSSProperties = {};
  if (user?.nameFont && FONT_PRESETS[user.nameFont]?.family) {
    nameStyle.fontFamily = FONT_PRESETS[user.nameFont].family;
    if (FONT_PRESETS[user.nameFont].weight) {
      nameStyle.fontWeight = FONT_PRESETS[user.nameFont].weight;
    }
  }
  if (user?.nameGradient) {
    nameStyle.backgroundImage = user.nameGradient;
    nameStyle.WebkitBackgroundClip = 'text';
    nameStyle.WebkitTextFillColor = 'transparent';
    if (user?.nameGlow) {
      nameStyle.filter = `drop-shadow(0 0 3px ${user.nameGlow}) drop-shadow(0 0 6px ${user.nameGlow}88)`;
    }
  } else if (user?.nameColor) {
    nameStyle.color = user.nameColor;
    nameStyle.WebkitTextFillColor = 'initial';
    if (user?.nameGlow) {
      nameStyle.filter = `drop-shadow(0 0 3px ${user.nameGlow}) drop-shadow(0 0 6px ${user.nameGlow}88)`;
    }
  } else {
    nameStyle.WebkitTextFillColor = 'initial';
    if (user?.nameGlow) {
      nameStyle.filter = `drop-shadow(0 0 3px ${user.nameGlow}) drop-shadow(0 0 6px ${user.nameGlow}88)`;
    }
  }

  const renderTag = () => {
    if (!showClanTag || !isClanActive || !clan?.tag) return null;

    const content = (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded-md border font-mono font-black text-[10px] tracking-wider shrink-0 mr-1 select-none shadow-2xs backdrop-blur-xs ${tagClassName}`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
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
    <span className={`inline-flex items-center gap-1 flex-wrap ${className}`}>
      {renderTag()}
      <span style={nameStyle} className="font-bold">
        {name}
      </span>
      {renderRoleIcon()}
    </span>
  );
}
