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

const { connectDB } = require('./server/db');
const { sessionMiddleware, passport } = require('./server/session');
const { registerSsoRoute } = require('./server/ssoRoute');
const { registerUploadRoutes } = require('./server/uploadRoute');
const { registerChatEvents } = require('./server/chatEvents');

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

  registerSsoRoute(app);
  registerUploadRoutes(app);

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

  app.all('*', (req, res) => handle(req, res));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Let socket.io see the same session/cookies the HTTP layer parsed.
  io.engine.use(cookieParser());
  io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, (err) => (err ? next(err) : next()));
  });

  registerChatEvents(io);

  server.listen(port, () => {
    console.log(`[web-next] ready on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('[web-next] fatal startup error', err);
  process.exit(1);
});
