/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app is always served behind the custom server.js (needed to host
  // Socket.io on the same process/port), so there is no separate "next
  // start" deployment target — see server.js.
};

module.exports = nextConfig;
