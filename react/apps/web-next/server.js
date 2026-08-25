// Custom server: Next.js needs to share a single HTTP server with
// Socket.io (a stateful, long-lived connection that a serverless/edge
// Next.js deployment can't host), and both need the same session
// middleware so a socket handshake can be authenticated from the same
// cookie the page request set. This mirrors the shape of the root
// app.js, just re-hosting the Next.js page renderer instead of EJS.
require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const next = require('next');
const { Server } = require('socket.io');

const security = require('../../../utils/security');

const { connectDB } = require('./server/db');
const { sessionMiddleware, passport } = require('./server/session');
const { registerSsoRoute } = require('./server/ssoRoute');
const { registerUploadRoutes } = require('./server/uploadRoute');
const { registerBulkRegisterRoute } = require('./server/bulkRegisterRoute');
const { registerRtspRoute } = require('./server/rtspRoute');
const { registerChatEvents } = require('./server/chatEvents');
const { registerCallEvents } = require('./server/callEvents');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '4100', 10);
const nextApp = next({ dev, dir: __dirname });
const handle = nextApp.getRequestHandler();

async function main() {
  await connectDB();
  await nextApp.prepare();

  const app = express();
  app.use(cookieParser());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.json());

  // Shared security middleware (utils/security.js — same module app.js
  // uses, required directly rather than duplicated).
  app.use(security.helmet);
  app.use(security.xssProtection);
  app.use(security.trackConnections);
  app.use(security.securityLogger);

  // Rate limits, sized to what each route actually is rather than a blind
  // port of the original's `/api/` prefix match — this app's own /api/me
  // and /api/upload are normal per-message chat traffic, not admin
  // operations, so they get the general limiter; only the two genuinely
  // sensitive admin/device endpoints get the strict one.
  app.use('/sso/callback', security.authLimiter);
  app.use(['/api/me', '/api/upload', '/uploads'], security.standardLimiter);
  app.use('/api/users/bulk-register', security.restrictToAllowedIPs, security.extremeLimiter);
  app.use('/rtsp/upload', security.restrictToAllowedIPs);

  registerSsoRoute(app);
  registerUploadRoutes(app);
  registerBulkRegisterRoute(app);

  // Minimal "who am I" endpoint the client chat shell calls once on
  // mount to get the logged-in user's id/name before opening the socket.
  app.get('/api/me', (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    const { _id, username, first_name, last_name } = req.user;
    res.json({ id: _id, username, first_name, last_name });
  });

  // Gate the chat shell behind auth the same way middleware/index.js's
  // isLoggedIn does; everything else (including client bundles/HMR)
  // passes through to Next.js.
  app.get(['/chat', '/chat/*'], (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect('/login');
    }
    next();
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Registered before the Next.js catch-all below, since it needs `io` to
  // broadcast the messages it ingests.
  registerRtspRoute(app, io);

  app.all('*', (req, res) => handle(req, res));

  // Let socket.io see the same session/cookies the HTTP layer parsed.
  io.engine.use(cookieParser());
  io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, (err) => (err ? next(err) : next()));
  });

  registerChatEvents(io);
  registerCallEvents(io);

  server.listen(port, () => {
    console.log(`[web-next] ready on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('[web-next] fatal startup error', err);
  process.exit(1);
});
