# MetaChat — Next.js rewrite (Phases 1–4)

A Next.js rewrite of the MetaChat frontend, built to match the "Hatypo
Studio" reference UI (rounded card layout, icon rail, member/attachments
side panel). This is **Phases 1–4 of a multi-phase rewrite** — see "Scope"
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
- **HTTPS.** `server.js` starts an `https.createServer` when `SSL_KEY_PATH`/
  `SSL_CERT_PATH` point at readable files (same Let's Encrypt paths `app.js`
  uses by default, so both apps can share one cert on the same host) and
  otherwise falls back to plain HTTP — no config needed for local/dev. It
  also 301-redirects `x-forwarded-proto: http` requests to `https`, same
  check `app.js` does, for the case where this sits behind a proxy that
  terminates TLS itself.

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

### Done (Phase 3 — WebRTC calling)
- **1:1 and group voice/video calls**, mesh-topology (every participant
  connects directly to every other), ported near-verbatim from `app.js`'s
  `call:*` signaling into `server/callEvents.js`: ring timeout (45s),
  device-switch confirmation (answering the same account on a second
  device), busy/no-answer/declined/disconnected end reasons, and STUN/TURN
  config from the same env vars (`STUN_URL`/`TURN_URL`/`TURN_SECRET`/
  `TURNS_URL` — see `.env.example`), including coturn's time-limited
  HMAC credential scheme.
- **Client**: `hooks/useCall.ts` owns the peer connections and signaling
  state machine; `CallOverlay.tsx` (in-call: local PiP, a responsive
  remote-tile grid, mute/camera/hang-up, live timer) and
  `IncomingCallToast.tsx` (ring-in UI, synthesized ringtone via Web Audio —
  no audio asset needed) are the two pieces of UI. Wired to the call
  buttons in the chat header.

### Deliberately simplified (Phase 3)
- The local video tile is fixed in a corner — the original vanilla-JS
  version had a draggable, resizable picture-in-picture; not carried over.
- Device-switch confirmation ("you're already in this call on another
  device — switch to this one?") uses `window.confirm` instead of a
  styled dialog.
- Remote participant avatars are initials, not the original's
  `/portal/profile/img/:username` image endpoint (which isn't part of
  this app).

### Done (Phase 4 — admin/security surface)
- **Security middleware** (`utils/security.js`, required directly rather
  than duplicated — it's side-effect-free, unlike some of the other
  root-level services): Helmet (CSP/HSTS/frameguard/etc.), XSS
  sanitization on `req.body`/`req.query`, per-IP connection tracking, and
  a security event logger, all applied globally.
- **Rate limiting**, sized to what each route actually is rather than a
  blind port of the original's blanket `/api/` prefix match: `authLimiter`
  on `/sso/callback`, `standardLimiter` on the regular chat-traffic
  endpoints (`/api/me`, `/api/upload`, `/uploads/:file`), and
  `extremeLimiter` reserved for the one genuinely sensitive admin route.
  (Porting the original's literal `/api/` blanket rule would have rate-limited
  ordinary file uploads to 5-per-hour — that's a config mismatch created by
  this app's own URL scheme, not something to carry forward.)
- **Bulk user import** (`POST /api/users/bulk-register`,
  `server/bulkRegisterRoute.js`) — imports users with a pre-computed
  passport-local-mongoose salt/hash, IP-allowlisted
  (`ALLOWED_PROFILE_IPS`). Two real fixes over the original: it had
  `return res.status(400)...` as the literal first line inside the route's
  try block, before the IP check and everything else — permanently
  disabling it regardless of input or caller. Read as a debug leftover
  rather than an intentional kill switch (see the comment in the file for
  the reasoning) and removed. It also cleaned the response with
  `delete userResponse.password`, but the schema field is `hash`/`salt`,
  not `password` — so the response was leaking the imported password hash
  and salt back to the caller. Fixed to delete the actual fields.
- **RTSP/device webhook ingestion** (`POST /rtsp/upload`,
  `server/rtspRoute.js`) — ported from `/upload_rtsp` +
  `services/log.js`'s `Log_message()`: IP-allowlisted, decrypts an
  encrypted payload, writes a message (with any attached files) into a
  room, and broadcasts it live over the socket to anyone with that room
  open. The target room id and the "sender" display name were hardcoded
  in the original — made configurable (`RTSP_ROOM_ID`, `RTSP_USERNAME`),
  defaulting to the same values.

### Deliberately simplified (Phase 4)
- The legacy PHP notification-backup pipeline (`sendBackupToPHP`, hitting
  an external `missionform/...notificationUsers.php` endpoint) isn't
  ported — out of scope for this rewrite, same reasoning as the other
  legacy-integration pieces skipped earlier.
- The original's `/SSO/admin/import-users` route (push all users to an
  external admin SSO service) isn't ported — unlike bulk-register, that
  one actually is intentionally disabled in the original (its own
  IP-restricted, always-403 guard), so there was no working behavior to
  restore.
- IP allowlisting for both new routes shares one list
  (`ALLOWED_PROFILE_IPS`) rather than the original's three separately
  hardcoded IP arrays (profile images, RTSP, bulk-register each had
  slightly different lists) — simpler to operate, at the cost of not
  being able to allow different callers per route.

### Deliberately not ported yet (later phases)
- Room creation/management UI, private-chat search/start flow, message
  search, notifications (toast/browser Notification API), link previews.

### Known pre-existing issues fixed while building this
- `models/user.js` did `require('passport-local-mongoose').default`, which
  is `undefined` for a normal install of that package (no default export) —
  this would crash on a fresh `npm install` for the existing app too. Fixed
  with a defensive fallback that accepts either shape.
- `passport-local-mongoose`, and (found while wiring up Phase 4)
  `express-rate-limit`, `express-slow-down`, `helmet`, `express-validator`,
  and `xss`, were all required by root-level shared files (`models/user.js`,
  `utils/security.js`) but missing from the root `package.json` — a fresh
  `npm install` wouldn't have pulled them for the existing app either.
  Added all of them.
- `app.js`'s `/api/users/bulk-register` and the response-cleanup bug in it
  — see "Done (Phase 4)" above.
