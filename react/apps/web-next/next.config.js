// Mounting under a URL sub-path behind a reverse proxy (e.g. nginx
// forwarding https://host/metachat/* here) — see server.js and
// .env.example for the matching server-side half of this.
const BASE_PATH = process.env.BASE_PATH || '';

// Dev-mode HMR requests are same-origin-only by default; behind a proxy
// (this app served at https://mc.farahoosh.ir/... while `next dev` itself
// only knows it's listening on localhost) that blocks every /_next/hmr
// request. Only relevant when NODE_ENV isn't "production" — production
// deployments should set that and skip this entirely.
const DEV_ORIGINS = (process.env.ALLOWED_DEV_ORIGINS || 'mc.farahoosh.ir')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app is always served behind the custom server.js (needed to host
  // Socket.io on the same process/port), so there is no separate "next
  // start" deployment target — see server.js.
  basePath: BASE_PATH,
  allowedDevOrigins: DEV_ORIGINS,
  env: {
    // Single source of truth for BASE_PATH: client code (lib/basePath.ts)
    // reads this instead of duplicating the env var under its own
    // NEXT_PUBLIC_ name.
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

module.exports = nextConfig;
