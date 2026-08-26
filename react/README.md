# MetaChat — Next.js rewrite

`apps/web-next` is the only app in this directory — a Next.js rewrite of the
MetaChat frontend that talks directly to the real backend's actual
socket/event contract. It shares the repo's existing `models/`,
`services/`, and `utils/security.js` directly (relative `require`, not
copies) rather than a separate abstraction layer, so it reads/writes the
exact same MongoDB data the existing Express app (`app.js`) does.

See `apps/web-next/README.md` for architecture, setup, and scope.

The earlier `apps/web` (Vite) and `apps/mobile` (Expo) prototypes, and the
`packages/core` shared-logic package they depended on, have been removed —
they were built against a from-scratch socket contract that was never wired
up to the real backend, and `web-next` superseded them.
