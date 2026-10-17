'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, ShieldCheck } from 'lucide-react';

export const FONT_PRESETS: Record<string, { label: string; family: string; weight?: string }> = {
  default: { label: 'Mặc định (Inter)', family: 'inherit', weight: '700' },
  outfit: { label: 'Outfit (Geometria)', family: "'Outfit', sans-serif", weight: '700' },
  orbitron: { label: 'Orbitron (Sci-fi)', family: "'Orbitron', sans-serif", weight: '800' },
  exo2: { label: 'Exo 2 (Esports)', family: "'Exo 2', sans-serif", weight: '800' },
  unbounded: { label: 'Unbounded (Bold)', family: "'Unbounded', sans-serif", weight: '800' },
  montserrat: { label: 'Montserrat (Clean)', family: "'Montserrat', sans-serif", weight: '800' },
  firacode: { label: 'Fira Code (Tech)', family: "'Fira Code', monospace", weight: '700' },
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

  // Style cho Tag Clan
  const clanTagStyle: React.CSSProperties = {};
  if (clan?.colorGradient) {
    clanTagStyle.backgroundImage = clan.colorGradient;
    clanTagStyle.WebkitBackgroundClip = 'text';
    clanTagStyle.WebkitTextFillColor = 'transparent';
  } else if (clan?.color) {
    clanTagStyle.color = clan.color;
  }

  // Style cho Tên Supporter
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
    if (user?.nameGlow) {
      nameStyle.filter = `drop-shadow(0 0 3px ${user.nameGlow}) drop-shadow(0 0 6px ${user.nameGlow}88)`;
    }
  } else if (user?.nameGlow) {
    nameStyle.filter = `drop-shadow(0 0 3px ${user.nameGlow}) drop-shadow(0 0 6px ${user.nameGlow}88)`;
  }

  const renderTag = () => {
    if (!showClanTag || !isClanActive || !clan?.tag) return null;

    const content = (
      <span
        className={`font-black text-[11px] tracking-wider shrink-0 mr-1 select-none ${tagClassName}`}
        style={clanTagStyle}
        title={`Clan [${clan.tag}]`}
      >
        [{clan.tag}]
      </span>
    );

    if (linkClan && clan.slug) {
      return (
        <Link
          href={`/clan/${clan.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="hover:opacity-80 transition-opacity"
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
