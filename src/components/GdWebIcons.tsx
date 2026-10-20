import React from 'react';

// Bộ biểu tượng SVG vector chuẩn Geometry Dash & Web GDVN
export const GDCP = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Hammer & Paintbrush Creator Points icon */}
    <path d="M14.7 3.3a1 1 0 0 0-1.4 0L11 5.6l2.4 2.4 2.3-2.3a1 1 0 0 0 0-1.4l-1-1zM9.6 7l-5.3 5.3a2 2 0 0 0 0 2.8l1.6 1.6-3.6 3.6a.7.7 0 0 0 1 1l3.6-3.6 1.6 1.6a2 2 0 0 0 2.8 0L16.6 14 9.6 7zm10.7-3.3a1.5 1.5 0 0 0-2.1 0l-1.9 1.9 2.1 2.1 1.9-1.9a1.5 1.5 0 0 0 0-2.1z" />
    <circle cx="19" cy="19" r="2.5" />
  </svg>
);

export const GDStar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.1l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.7L12 2z" />
  </svg>
);

export const GDMoon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.5 5.5 0 0 1-7.54-7.54A9.03 9.03 0 0 0 12 3z" />
    <circle cx="15.5" cy="14.5" r="1.5" opacity="0.3" fill="black" />
    <circle cx="11.5" cy="17.5" r="1.2" opacity="0.3" fill="black" />
  </svg>
);

export const GDDiamond = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 3h12l5 6-11 12L1 9l5-6zm1.2 2L4 8.5h4.2l1.6-3.5H7.2zm4.8 0L10.3 8.5h3.4L12 5zm2.8 0l1.6 3.5H20l-3.2-3.5h-2.8zM4.7 10.5l7.3 8 7.3-8H4.7z" />
  </svg>
);

export const GDCoin = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    <path d="M12 6.5l1.6 3.5 3.9.4-2.9 2.6.8 3.8-3.4-1.9-3.4 1.9.8-3.8-2.9-2.6 3.9-.4L12 6.5z" fill="white" />
  </svg>
);

export const GDUserCoin = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="8" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
    <circle cx="12" cy="12" r="4.5" fill="white" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
  </svg>
);

export const GDOrb = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="6" fill="white" opacity="0.5" />
    <circle cx="9.5" cy="9.5" r="2" fill="white" />
  </svg>
);

export const GDDemon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Demon face with horns */}
    <path d="M3 5l3 3c1-1 3.5-2 6-2s5 1 6 2l3-3c-.5 4-1 6-2 7 0 5-3 8-7 8s-7-3-7-8c-1-1-1.5-3-2-7z" />
    {/* Horns & Eyes */}
    <circle cx="8.5" cy="12.5" r="1.5" fill="white" />
    <circle cx="15.5" cy="12.5" r="1.5" fill="white" />
    <path d="M8 16.5c1.5 1 6.5 1 8 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

export const GDExtremeDemon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Menacing horned demon skull */}
    <path d="M2 3l4 4c1.5-1 3.8-1.5 6-1.5s4.5.5 6 1.5l4-4c-.8 5-1.5 7.5-2.5 8.5 0 6-3.5 9.5-7.5 9.5S4.5 17.5 4.5 11.5C3.5 10.5 2.8 8 2 3z" />
    <path d="M7 11.5l3 1-3 1.5v-2.5zm10 0l-3 1 3 1.5v-2.5z" fill="white" />
    <path d="M7.5 16l1.5-1 1.5 1 1.5-1 1.5 1 1.5-1 1.5 1" stroke="white" strokeWidth="1.2" fill="none" />
  </svg>
);

export const GDNormal = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <circle cx="8.5" cy="10" r="1.5" fill="white" />
    <circle cx="15.5" cy="10" r="1.5" fill="white" />
    <path d="M7.5 14.5c1.5 2.5 7.5 2.5 9 0" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

export const GDHard = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <path d="M7 9l3 1.5M17 9l-3 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="8.5" cy="11.5" r="1.2" fill="white" />
    <circle cx="15.5" cy="11.5" r="1.2" fill="white" />
    <path d="M8.5 16h7" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const GDHarder = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <path d="M7 8.5l3.5 2M17 8.5l-3.5 2" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="8.5" cy="12" r="1.3" fill="white" />
    <circle cx="15.5" cy="12" r="1.3" fill="white" />
    <path d="M8.5 16.5c1.5-1 5.5-1 7 0" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

export const GDInsane = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <path d="M6.5 8l4 3M17.5 8l-4 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="8" cy="12.5" r="1.5" fill="white" />
    <circle cx="16" cy="12.5" r="1.5" fill="white" />
    <path d="M8 17l2-1.5 2 1.5 2-1.5 2 1.5" stroke="white" strokeWidth="1.8" fill="none" />
  </svg>
);

export const GDAuto = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="4" width="18" height="16" rx="4" />
    <circle cx="8.5" cy="11" r="2" fill="white" />
    <circle cx="15.5" cy="11" r="2" fill="white" />
    <path d="M8 16h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const GDCube = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="6" y="6" width="12" height="12" fill="none" stroke="white" strokeWidth="1.5" />
    <rect x="8.5" y="8.5" width="2.5" height="2.5" fill="white" />
    <rect x="13" y="8.5" width="2.5" height="2.5" fill="white" />
    <path d="M8.5 14h7" stroke="white" strokeWidth="1.8" />
  </svg>
);

export const GDWave = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l6-10 6 10 6-10" />
  </svg>
);

export const GDShip = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 13l5-6 10 2 5 3-4 5-11 1-5-5z" />
    <circle cx="12" cy="11" r="2" fill="white" />
  </svg>
);

export const GDUfo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <ellipse cx="12" cy="14" rx="10" ry="4" />
    <path d="M7 13c0-3 2.2-5 5-5s5 2 5 5" fill="white" opacity="0.7" />
    <circle cx="8" cy="14" r="1" fill="white" />
    <circle cx="12" cy="14" r="1" fill="white" />
    <circle cx="16" cy="14" r="1" fill="white" />
  </svg>
);

export const GDKey = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 14a5 5 0 1 1 5-5l5 5v3h-3v2h-2v-2l-1.5-1.5A4.97 4.97 0 0 1 7 14zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
  </svg>
);

export const GDSkull = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a8 8 0 0 0-8 8c0 3.2 1.8 5.7 4 6.8V19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.2c2.2-1.1 4-3.6 4-6.8a8 8 0 0 0-8-8zm-3.5 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM10 18h4v1.5h-4V18z" />
  </svg>
);

export const WebDev = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <path d="M7 8l-2 2 2 2M17 8l2 2-2 2M13 7l-2 6" />
  </svg>
);

export const WebCrown = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v2H3v-2zm1-3l2.5-8L12 12l5.5-5 2.5 8H4z" />
    <circle cx="5" cy="6" r="1.5" />
    <circle cx="12" cy="4" r="1.5" />
    <circle cx="19" cy="6" r="1.5" />
  </svg>
);

export const WebShield = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4zm0 4.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5L12 6.5z" />
  </svg>
);

export const WebFlame = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c-.5 2.5-3 5-4.5 7.5C6 12 6 14.5 7.5 17c1.5 2.5 4.5 4 4.5 4s3-1.5 4.5-4c1.5-2.5 1.5-5 0-7.5-1.5-2.5-4-5-4.5-7.5zm0 10c1.5 1 2 2.5 1.5 4-.5 1-1.5 1.5-1.5 1.5s-1-.5-1.5-1.5c-.5-1.5 0-3 1.5-4z" />
  </svg>
);

export const WebClan = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 2v20h2V14h12l-3-5 3-5H6V2H4z" />
  </svg>
);

export const WebTrophy = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 3h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V3zm-2 2H2v3a4 4 0 0 0 4 4h1a6.97 6.97 0 0 1-1-3V5zm16 0v2c0 1.1-.3 2.1-1 3h1a4 4 0 0 0 4-4V5h-4zM11 13.9V18H8v2h8v-2h-3v-4.1a7.03 7.03 0 0 0 4-2.9 6.9 6.9 0 0 0 1-4V4H6v3c0 1.5.5 2.9 1.4 4 .9 1.3 2.2 2.2 3.6 2.9z" />
  </svg>
);

export const WebRank = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="13" width="6" height="8" rx="1" />
    <rect x="9" y="7" width="6" height="14" rx="1" />
    <rect x="16" y="10" width="6" height="11" rx="1" />
    <path d="M12 2l1.2 2.5 2.8.4-2 2 .5 2.7L12 8.3l-2.5 1.3.5-2.7-2-2 2.8-.4L12 2z" />
  </svg>
);

export const GD_WEB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  GDCP,
  GDStar,
  GDMoon,
  GDDiamond,
  GDCoin,
  GDUserCoin,
  GDOrb,
  GDDemon,
  GDExtremeDemon,
  GDNormal,
  GDHard,
  GDHarder,
  GDInsane,
  GDAuto,
  GDCube,
  GDWave,
  GDShip,
  GDUfo,
  GDKey,
  GDSkull,
  WebDev,
  WebCrown,
  WebShield,
  WebFlame,
  WebClan,
  WebTrophy,
  WebRank,
};
