# MetaChat — Next.js rewrite (Phase 1)

A Next.js rewrite of the MetaChat frontend, built to match the "Hatypo
Studio" reference UI (rounded card layout, icon rail, member/attachments
side panel). This is **Phase 1 of a multi-phase rewrite** — see "Scope" below
for exactly what works today.

## Architecture

- **Same database, same crypto keys as the existing app.** `server/` requires
  the repo's shared `models/` and `services/encryption.js` directly (relative
  `require`, not copies) so this app reads/writes the exact same MongoDB data
  the existing Express app (`app.js`) does, decrypting with the same
  `SOCKET_SECRET_KEY`. Both apps can run side by side against the same DB.
- **Custom server (`server.js`).** Next.js's serverless request model can't
  host a persistent Socket.io connection, so this app runs a plain Node HTTP
  server: Express handles session/passport/the SSO login route, Socket.io
  shares the same session middleware (so a socket handshake authenticates off
  the same cookie the page request set), and everything else falls through to
  Next.js's page renderer.
- **Not built on `react/packages/core`.** That package defines its own
  from-scratch socket contract (see its `types.ts` — it says so itself). This
  app instead implements the **real** event names/payloads ported from
  `app.js`, typed in `lib/types.ts`.

## Running it

1. `npm install` from the repo root (npm workspaces — this app is
   `react/apps/web-next` in the root `package.json`'s `workspaces` list).
2. `cp .env.example .env` and fill in values that **match your existing
   root `.env`** (`SESSION_SECRET`, `SOCKET_SECRET_KEY`, `SSO_SECRET_TOKEN`,
   Mongo credentials) — see the comments in `.env.example` for why they must
   match.
3. `npm run dev` (runs `node server.js`; add `--workspace=@metachat/web-next`
   from the repo root, or `cd react/apps/web-next` first).
4. Log in the same way the existing app does: via your SSO provider
   redirecting to `/sso/callback?token=...`. There's no standalone
   username/password form — the original app's isn't reachable either
   (`POST /login` is dead code there too; SSO is the only real login path).

I could not fully exercise this end-to-end in the sandbox this was built in
— no MongoDB instance or real SSO token issuer was reachable there.
`npx tsc --noEmit` and `npx next build` both pass cleanly, and `node
server.js` starts up correctly and gets exactly as far as the MongoDB
connection attempt (which fails only because no DB was reachable in that
environment) — so the wiring is sound, but please treat the first real run
against your actual DB/SSO as the real smoke test.

## Scope

### Done (Phase 1)
- Session/passport auth via the same SSO callback flow as the existing app
  (`/sso/callback`), same `autoLogin` cookie, same socket auth middleware.
- Room list, joining a room, sending/receiving text messages, typing
  indicators, online presence — real events (`roomList`, `joinRoom`, `chat`,
  `typing`, `userLoggedIn`) against the real database.
- Real (not fabricated) unread-count badges and attachments summary —
  computed from actual `Message` documents, including ones created by the
  existing app (voice notes, video notes, images, etc. already in the DB),
  even though this app doesn't have upload UI of its own yet.
- UI matching the reference screenshot: icon rail, conversation list with
  search, chat header with typing status, message bubbles grouped by day,
  members + attachments panel.

### Deliberately not ported yet (later phases)
- File/voice/video message upload and playback, message reactions,
  edit/delete, forwarding, replies, read receipts beyond the initial
  unread count, older-message pagination (`requestOlderMessages`).
- WebRTC calling (1:1 and group voice/video, TURN/STUN signaling) — this is
  a substantial chunk of `app.js` on its own.
- Admin/security surface: rate limiting, IP allowlisting, bulk user import,
  RTSP ingestion, the legacy PHP notification backup pipeline.
- Room creation/management UI, private-chat search/start flow.

### Known pre-existing issues fixed while building this
- `models/user.js` did `require('passport-local-mongoose').default`, which
  is `undefined` for a normal install of that package (no default export) —
  this would crash on a fresh `npm install` for the existing app too. Fixed
  with a defensive fallback that accepts either shape.
- `passport-local-mongoose` was required by `models/user.js` but missing
  from the root `package.json` — added it.
