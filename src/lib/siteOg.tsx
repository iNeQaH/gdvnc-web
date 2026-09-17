import { ImageResponse } from 'next/og';
import { loadOgVietnameseFont, ogFontOptions } from '@/lib/ogFonts';

export const SITE_OG_SIZE = { width: 1200, height: 630 };

export async function renderSiteOgImage(title: string, description: string) {
  const fontData = await loadOgVietnameseFont();
  const fonts = ogFontOptions(fontData);
  const fontFamily = fonts ? 'Noto Sans' : 'system-ui';

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
          fontFamily,
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, color: '#60a5fa', marginBottom: 20, fontWeight: 700 }}>
          GDVN
        </div>
        <div style={{ display: 'flex', fontSize: 58, fontWeight: 800, lineHeight: 1.15 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 28, color: '#94a3b8', marginTop: 24, lineHeight: 1.35 }}>
          {description}
        </div>
      </div>
    ),
    { ...SITE_OG_SIZE, fonts }
  );
}

export async function renderLevelOgImage(
  levelName: string,
  faceSrc: string,
  ratingSrc: string | null
) {
  const fontData = await loadOgVietnameseFont();
  const fonts = ogFontOptions(fontData);
  const fontFamily = fonts ? 'Noto Sans' : 'system-ui';
  const title = levelName.length > 72 ? `${levelName.slice(0, 69)}…` : levelName;
  const iconSize = 220;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 56,
          padding: 72,
          background: '#0b1120',
          color: '#ffffff',
          fontFamily,
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: iconSize,
            height: iconSize,
            flexShrink: 0,
          }}
        >
          {ratingSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ratingSrc}
              width={iconSize}
              height={iconSize}
              style={{ position: 'absolute', left: 0, top: 0, objectFit: 'contain' }}
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faceSrc}
            width={iconSize}
            height={iconSize}
            style={{ position: 'absolute', left: 0, top: 0, objectFit: 'contain' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', fontSize: 26, color: '#60a5fa', marginBottom: 16, fontWeight: 700 }}>
            GDVN · Level
          </div>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, lineHeight: 1.12 }}>{title}</div>
        </div>
      </div>
    ),
    { ...SITE_OG_SIZE, fonts }
  );
}
