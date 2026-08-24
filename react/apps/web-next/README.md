# MetaChat — Next.js rewrite (Phases 1–2)

A Next.js rewrite of the MetaChat frontend, built to match the "Hatypo
Studio" reference UI (rounded card layout, icon rail, member/attachments
side panel). This is **Phases 1–2 of a multi-phase rewrite** — see "Scope"
below for exactly what works today.

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
  computed from actual `Message` documents.
- UI matching the reference screenshot: icon rail, conversation list with
  search, chat header with typing status, message bubbles grouped by day,
  members + attachments panel.

### Done (Phase 2 — file/voice/video + core messenger features)
- **File uploads**: `POST /api/upload` (multer, 50MB cap, same `uploads/`
  directory the existing app uses) + `GET /uploads/:file` with the same
  room-membership permission check as `app.js`'s `file_access()`. Images
  render inline, audio/video get real players, everything else gets a
  download card.
- **Voice messages**: hold-to-record on the composer's mic/video button
  (tap to swap between voice/video mode, hold past 150ms to record, drag
  left to cancel, drag up to lock hands-free) — same gesture model built
  for the vanilla-JS app earlier, reimplemented as a React hook
  (`hooks/useVoiceRecorder.ts`) + component (`RecordButton.tsx`).
- **Round video messages**: `VideoNoteOverlay.tsx` — live circular preview
  with a blurred glow of the same feed behind it, and a working camera
  flip. The recorder is bound to a `<canvas>` capture stream (the active
  camera is *drawn onto* the canvas every frame) rather than the raw
  camera stream directly, specifically so flipping cameras mid-recording
  never touches the actual `MediaRecorder`'s stream — the MediaStream
  Recording spec has the recorder stop with an error the instant a track
  is added to/removed from its stream, which is what silently broke this
  same feature in the vanilla-JS version earlier in this project.
- **Reply, forward, edit, delete** — full round trip: composer reply/edit
  bar, a forward picker dialog, sender-only edit/delete authorization
  server-side.
- **Reactions** — emoji picker, counts, click-to-toggle your own reaction.
- **Read receipts** — messages are marked read ~1s after they're visible
  in the open room; a real "heard" checkmark appears on your own voice
  notes once the recipient has played them (`voice_heared`).
- **Pagination** — scrolling to the top of the message list loads the next
  50 older messages and preserves scroll position.

### Deliberately simplified vs. the original `app.js`
- `requestOlderMessages` only supports the common "load older, before this
  id" case. The original also has `last`/`latest`/`reply-<id>` jump-to-context
  variants (catching up after a long absence, jumping to a quoted message's
  original location) — not ported; scroll-up pagination covers the normal
  chat-history use case.
- `markMessagesRead`/edit/delete don't replicate the hardcoded admin-bypass
  user id (`'6a1dbb49d1be99b6fd1f9772'`) that lets one specific account edit
  or delete anyone's messages in the original — only a message's own sender
  can edit/delete it here. If you need that back, it's a one-line change in
  `server/chatEvents.js`, but it read like an org-specific special case
  rather than something to carry into a generic rewrite.
- No image lightbox/gallery (images open in a new tab), no full waveform
  rendering for voice notes (a seek bar + play/pause instead), no
  drag-and-drop file upload (file picker only).

### Deliberately not ported yet (later phases)
- WebRTC calling (1:1 and group voice/video, TURN/STUN signaling) — this is
  a substantial chunk of `app.js` on its own.
- Admin/security surface: rate limiting, IP allowlisting, bulk user import,
  RTSP ingestion, the legacy PHP notification backup pipeline.
- Room creation/management UI, private-chat search/start flow, message
  search, notifications (toast/browser Notification API), link previews.

### Known pre-existing issues fixed while building this
- `models/user.js` did `require('passport-local-mongoose').default`, which
  is `undefined` for a normal install of that package (no default export) —
  this would crash on a fresh `npm install` for the existing app too. Fixed
  with a defensive fallback that accepts either shape.
- `passport-local-mongoose` was required by `models/user.js` but missing
  from the root `package.json` — added it.
