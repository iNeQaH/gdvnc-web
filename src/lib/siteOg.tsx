import { ImageResponse } from 'next/og';

export const SITE_OG_SIZE = { width: 1200, height: 630 };

export function renderSiteOgImage(title: string, description: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#0b1120',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, color: '#60a5fa', marginBottom: 20, fontWeight: 700 }}>
          GDVN
        </div>
        <div style={{ display: 'flex', fontSize: 58, fontWeight: 800, lineHeight: 1.15 }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#94a3b8', marginTop: 24, lineHeight: 1.35 }}>
          {description}
        </div>
      </div>
    ),
    SITE_OG_SIZE
  );
}
