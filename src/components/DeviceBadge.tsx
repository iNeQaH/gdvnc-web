'use client';

import React from 'react';
import { Monitor, Smartphone, HelpCircle } from 'lucide-react';

export function formatDeviceLabel(device?: string | null): {
  label: 'PC' | 'Mobile' | 'Khác';
  type: 'pc' | 'mobile' | 'other';
} {
  if (!device) return { label: 'Khác', type: 'other' };
  const d = String(device).trim().toLowerCase();
  if (d === 'pc') return { label: 'PC', type: 'pc' };
  if (
    d.includes('mobile') ||
    d.includes('android') ||
    d.includes('ios') ||
    d.includes('tablet') ||
    d.includes('phone') ||
    d.includes('ipad')
  ) {
    return { label: 'Mobile', type: 'mobile' };
  }
  return { label: 'Khác', type: 'other' };
}

export default function DeviceBadge({
  device,
  className = '',
}: {
  device?: string | null;
  className?: string;
}) {
  const { label, type } = formatDeviceLabel(device);

  if (type === 'pc') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0 ${className}`}
        title="Thiết bị: PC"
      >
        <Monitor className="w-3 h-3 shrink-0" />
        <span>PC</span>
      </span>
    );
  }

  if (type === 'mobile') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 ${className}`}
        title="Thiết bị: Mobile"
      >
        <Smartphone className="w-3 h-3 shrink-0" />
        <span>Mobile</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 shrink-0 ${className}`}
      title="Thiết bị: Khác"
    >
      <HelpCircle className="w-3 h-3 shrink-0 opacity-70" />
      <span>Khác</span>
    </span>
  );
}
