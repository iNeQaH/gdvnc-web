import type { NextConfig } from "next";

const extraOrigins = (process.env.ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://open.spotify.com https://discord.com https://challenges.cloudflare.com",
              "media-src 'self' https: blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/u/:username',
        destination: '/profile/:username',
        permanent: true,
      },
    ];
  },
  // Allow LAN / public IP / tunnels to load /_next JS in `next dev`.
  // Without this, remote browsers get HTML but clicks (login, theme, register) do nothing.
  allowedDevOrigins: [
    "*.*",
    "*.*.*",
    "*.*.*.*",
    "*.*.*.*.*",
    "*.*.*.*.*.*",
    "*.local",
    "**.localhost",
    "**.ngrok-free.app",
    "**.ngrok.io",
    "**.trycloudflare.com",
    "**.nip.io",
    "**.sslip.io",
    "**.ddns.net",
    "**.duckdns.org",
    ...extraOrigins,
  ],
};

export default nextConfig;
