# MetaChat — React + React Native rewrite

This is a monorepo starter that ports the core chat flow (rooms, messages,
socket connection) from the old jQuery/socket.io app to React (web) and
React Native/Expo (mobile), sharing all non-visual logic.

```
metachat/
  packages/core/     ← shared logic: types, socket client, hooks, offline queue
  apps/web/           ← React + Vite web client
  apps/mobile/         ← React Native + Expo client
```

## Why a shared core package

Everything that isn't UI — the socket connection, the typed event contract,
joining/sending messages, optimistic sends, the offline retry queue — lives
once in `packages/core`. Both apps consume it via the same hooks
(`useSocket`, `useRooms`, `useChat`) and only differ in how they render and
in which storage backend they register (`localStorage` vs `AsyncStorage`,
wired up in `apps/web/src/main.tsx` and `apps/mobile/App.tsx`).

## What's included in this pass (core chat)

- Socket connection lifecycle with auto-reconnect (`useSocket`)
- Room list (`useRooms`)
- Joining a room, receiving/sending messages, optimistic UI, ack
  reconciliation by `tempId`, and an offline queue that flushes on reconnect
  (`useChat`, `messageQueue.ts`) — this replaces the old `sendNext` /
  localStorage queue logic in `chat_v0503.js`
- A minimal login stub (the old app read the user from server-rendered
  `#_id`/`#username` elements — replace `useCurrentUser`/`AsyncStorage`
  bootstrapping with your real auth)

## Socket contract

Defined in `packages/core/src/types.ts` (`ClientToServerEvents` /
`ServerToClientEvents`). It's a clean, explicit contract rather than a
reverse-engineering of the old ad-hoc events — implement this shape on the
backend (or tell me your existing event names/payloads and I'll match them
instead).

## Running it

```bash
npm install          # from repo root, installs all workspaces
npm run web           # starts the Vite dev server
npm run mobile        # starts Expo (scan QR with Expo Go, or press i/a)
```

Set `VITE_SOCKET_URL` (web, `.env`) / `app.json > expo.extra.socketUrl`
(mobile) to point at your server.

## Not yet ported (next phases, per your priority)

These existed in the original files and are intentionally left out of this
pass so core chat could land first:

- **Notifications** (`notification.js`) — toast + browser `Notification` API
  + sound. Needs a native equivalent (`expo-notifications`) for mobile.
- **Presence** (`chat_v0503.js`) — online/sleeping users, inactivity timer.
- **Theme switching** (`theme.js`) — light/dark/auto, trivial on web
  (`prefers-color-scheme`), needs `useColorScheme` + a theme context on
  native.
- **Room management UI** (`roomManagement.js`) — creating rooms, member
  lists, room settings.
- **Rich message features** from `chat_v0503.js`: emoji/sticker reactions,
  replies (the type already has `replyTo`, UI doesn't yet), file/image
  upload with compression, right-click context menu, read receipts,
  message editing/deleting, pasted-table handling.
- **Devices/sessions list** (`profile.js`).

Say which of these to do next and I'll build it the same way — shared logic
in `packages/core`, thin UI in each app.
