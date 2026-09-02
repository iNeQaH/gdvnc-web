'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { classifyMediaUrl, splitMediaUrls } from '@/lib/mediaEmbed';

export default function MediaExpandEmbed({
  url,
  extraUrls,
  label,
  expandLabel,
  collapseLabel,
}: {
  url?: string | null;
  extraUrls?: string[];
  label: string;
  expandLabel: string;
  collapseLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const urls = [...(url ? [url] : []), ...(extraUrls || [])].filter(Boolean);
  if (urls.length === 0) return null;

  const primary = urls[0];

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="ui-dim shrink-0">{label}:</span>
        <a
          href={primary}
          target="_blank"
          rel="noreferrer"
          className="font-semibold truncate hover:underline min-w-0"
          style={{ color: 'var(--accent)' }}
        >
          {primary}
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-0.5 shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer"
          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--accent)' }}
        >
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {open ? collapseLabel : expandLabel}
        </button>
      </div>
      {open && (
        <div className="space-y-2">
          {urls.map((item) => {
            const media = classifyMediaUrl(item);
            if (media.kind === 'youtube' || media.kind === 'drive') {
              return (
                <div key={item} className="rounded-xl overflow-hidden border aspect-video" style={{ borderColor: 'var(--border-ui)' }}>
                  <iframe
                    src={media.src}
                    title={label}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              );
            }
            if (media.kind === 'image') {
              return (
                <a key={item} href={item} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-ui)' }}>
                  <img src={item} alt="" className="max-h-72 w-full object-contain bg-black/20" />
                </a>
              );
            }
            return (
              <a
                key={item}
                href={item}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                <ExternalLink className="w-3 h-3" />
                {item}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WorkImageEmbeds({
  imageUrl,
  label,
  expandLabel,
  collapseLabel,
}: {
  imageUrl?: string | null;
  label: string;
  expandLabel: string;
  collapseLabel: string;
}) {
  const urls = splitMediaUrls(imageUrl);
  if (urls.length === 0) return null;
  return (
    <MediaExpandEmbed
      extraUrls={urls}
      label={label}
      expandLabel={expandLabel}
      collapseLabel={collapseLabel}
    />
  );
}
