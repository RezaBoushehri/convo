// Mirrors next.config.js's `basePath` (itself driven by the server-side
// BASE_PATH env var — see server.js and .env.example) so client code can
// build URLs that survive being served under a reverse-proxy sub-path
// (e.g. nginx forwarding https://host/metachat/* here). Next.js's own
// router/<Link> prefix automatically; anything we build by hand — fetch()
// calls, the socket.io-client path, file URLs read out of message data —
// does not, and needs this applied explicitly.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function withBasePath(path: string): string {
  return BASE_PATH ? `${BASE_PATH}${path}` : path;
}
