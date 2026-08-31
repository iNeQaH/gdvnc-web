'use client';

import type { ComponentType } from 'react';
import * as AllLucideIcons from 'lucide-react';
import { CUSTOM_ICONS } from '@/components/CustomIcons';

export function resolveIcon(icon?: string | null) {
  const name = String(icon || 'Star').trim() || 'Star';
  return (CUSTOM_ICONS as Record<string, ComponentType<{ className?: string }>>)[name]
    || (AllLucideIcons as Record<string, unknown>)[name] as ComponentType<{ className?: string }>
    || AllLucideIcons.Star;
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
