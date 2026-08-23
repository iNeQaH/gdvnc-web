import type { NextConfig } from "next";

const extraOrigins = (process.env.ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  devIndicators: false,
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
