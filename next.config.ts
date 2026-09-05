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
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
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
  async rewrites() {
    // Vercel runs Next.js only — do not proxy /api to localhost (or a missing Express).
    const backendUrl =
      process.env.BACKEND_URL || (process.env.VERCEL ? '' : 'http://localhost:8080');
    if (!backendUrl) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: backendUrl + '/api/:path*',
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
