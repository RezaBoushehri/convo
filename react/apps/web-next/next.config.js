// Mounting under a URL sub-path behind a reverse proxy (e.g. nginx
// forwarding https://host/metachat/* here) — see server.js and
// .env.example for the matching server-side half of this.
const BASE_PATH = process.env.BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app is always served behind the custom server.js (needed to host
  // Socket.io on the same process/port), so there is no separate "next
  // start" deployment target — see server.js.
  basePath: BASE_PATH,
  env: {
    // Single source of truth for BASE_PATH: client code (lib/basePath.ts)
    // reads this instead of duplicating the env var under its own
    // NEXT_PUBLIC_ name.
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

module.exports = nextConfig;
