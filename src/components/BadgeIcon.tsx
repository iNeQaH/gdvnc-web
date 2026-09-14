'use client';

import type { ComponentType } from 'react';
import {
  Star,
  Sparkles,
  Gem,
  Hexagon,
  Triangle,
  Square,
  Circle,
  Pentagon,
  Octagon,
  Box,
  Boxes,
  Cuboid,
  Layers,
  Grid3x3,
  Component,
  Orbit,
  Aperture,
  Rainbow,
  Flower2,
  Flame,
  Zap,
  Moon,
  Sun,
  Cloud,
  Mountain,
  Wand2,
  Palette,
  Paintbrush,
  Brush,
  PenTool,
  Pencil,
  PencilRuler,
  Eraser,
  Pipette,
  SprayCan,
  Wrench,
  Hammer,
  Ruler,
  Scissors,
  Magnet,
  Cog,
  Settings2,
  SlidersHorizontal,
  Move,
  RotateCw,
  FlipHorizontal,
  Crop,
  Users,
  UserPlus,
  Heart,
  Handshake,
  MessageCircle,
  Globe,
  Flag,
  Share2,
  Megaphone,
  MessagesSquare,
  Trophy,
  Medal,
  Award,
  Crown,
  BadgeCheck,
  Target,
  Rocket,
  Shield,
  Swords,
  Lightbulb,
  Music,
  Clapperboard,
  Film,
  Camera,
  Mic,
  Headphones,
  Puzzle,
  Gamepad2,
  Joystick,
  Dice5,
  Gift,
  PartyPopper,
} from 'lucide-react';
import { CUSTOM_ICONS } from '@/components/CustomIcons';

const LUCIDE_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Star,
  Sparkles,
  Gem,
  Hexagon,
  Triangle,
  Square,
  Circle,
  Pentagon,
  Octagon,
  Box,
  Boxes,
  Cuboid,
  Layers,
  Grid3x3,
  Component,
  Orbit,
  Aperture,
  Rainbow,
  Flower2,
  Flame,
  Zap,
  Moon,
  Sun,
  Cloud,
  Mountain,
  Wand2,
  Palette,
  Paintbrush,
  Brush,
  PenTool,
  Pencil,
  PencilRuler,
  Eraser,
  Pipette,
  SprayCan,
  Wrench,
  Hammer,
  Ruler,
  Scissors,
  Magnet,
  Cog,
  Settings2,
  SlidersHorizontal,
  Move,
  RotateCw,
  FlipHorizontal,
  Crop,
  Users,
  UserPlus,
  Heart,
  Handshake,
  MessageCircle,
  Globe,
  Flag,
  Share2,
  Megaphone,
  MessagesSquare,
  Trophy,
  Medal,
  Award,
  Crown,
  BadgeCheck,
  Target,
  Rocket,
  Shield,
  Swords,
  Lightbulb,
  Music,
  Clapperboard,
  Film,
  Camera,
  Mic,
  Headphones,
  Puzzle,
  Gamepad2,
  Joystick,
  Dice5,
  Gift,
  PartyPopper,
};

export function resolveIcon(icon?: string | null) {
  const name = String(icon || 'Star').trim() || 'Star';
  return (
    (CUSTOM_ICONS as Record<string, ComponentType<{ className?: string }>>)[name] ||
    LUCIDE_ICON_MAP[name] ||
    Star
  );
}

export function IconGlyph({ icon, className }: { icon?: string | null; className?: string }) {
  const Comp = resolveIcon(icon);
  return <Comp className={className} />;
}

export default function BadgeIcon({
  icon,
  color,
  glow,
  className = 'w-4 h-4',
  title,
}: {
  icon?: string | null;
  color?: string | null;
  glow?: boolean | string | null;
  className?: string;
  title?: string;
}) {
  const fill = color || 'var(--accent)';
  const glowing = Boolean(glow);
  return (
    <span
      title={title}
      className="gdvn-badge-icon"
      style={{
        color: fill,
        filter: glowing
          ? `drop-shadow(0 0 1.2px ${fill}) drop-shadow(0 0 3px ${fill})`
          : undefined,
      }}
    >
      <IconGlyph icon={icon} className={className} />
    </span>
  );
}
