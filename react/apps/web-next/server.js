// Custom server: Next.js needs to share a single HTTP server with
// Socket.io (a stateful, long-lived connection that a serverless/edge
// Next.js deployment can't host), and both need the same session
// middleware so a socket handshake can be authenticated from the same
// cookie the page request set. This mirrors the shape of the root
// app.js, just re-hosting the Next.js page renderer instead of EJS.
const path = require('path');
// Explicit path, not the default cwd-relative lookup — a process manager
// (PM2, systemd, ...) can launch this from a different working directory
// than react/apps/web-next, in which case dotenv would silently find no
// .env at all and every value below would be undefined instead of erroring
// loudly, since nothing here checks dotenv's own return value.
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const cookieParser = require('cookie-parser');
const next = require('next');
const { Server } = require('socket.io');

const security = require('../../../utils/security');

// Same TLS termination app.js uses in production (Let's Encrypt on the
// same host), but env-overridable and optional — unset/missing files fall
// back to plain HTTP so local/dev/sandbox runs aren't forced onto certs
// that don't exist there.
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '/etc/letsencrypt/live/mc.farahoosh.ir/privkey.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/mc.farahoosh.ir/fullchain.pem';

function loadSslOptions() {
  if (!fs.existsSync(SSL_KEY_PATH) || !fs.existsSync(SSL_CERT_PATH)) return null;
  try {
    return {
      key: fs.readFileSync(SSL_KEY_PATH, 'utf8'),
      cert: fs.readFileSync(SSL_CERT_PATH, 'utf8'),
    };
  } catch (err) {
    console.error('[web-next] found SSL_KEY_PATH/SSL_CERT_PATH but failed to read them, falling back to HTTP', err);
    return null;
  }
}

// Mounting under a URL sub-path behind a reverse proxy (e.g. nginx
// forwarding https://host/metachat/* here). Must match next.config.js's
// basePath (same env var, read there too) so page routing, redirects,
// and the routes below all agree on where the app actually lives. Empty
// string serves at the domain root, matching local/dev.
//
// Requires the proxy to forward the FULL request path, not strip the
// prefix — e.g. nginx's proxy_pass needs no trailing path component
// (`proxy_pass https://127.0.0.1:4000;`, not `.../4000/;`), so Express
// sees `${BASE_PATH}/login` etc. rather than a stripped `/login` that
// would collide with whatever else lives at that path on the same
// domain. Socket.io is the one exception: it keeps its default
// `/socket.io/` path server-side, since nginx's dedicated
// `/metachat/socket.io/` location already rewrites that one sub-path
// back to bare `/socket.io/` before it reaches this process.
const BASE_PATH = process.env.BASE_PATH || '';

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

  // Behind a reverse proxy that terminates TLS itself (or that forwards
  // to this process over plain HTTP), send plain-HTTP requests back as
  // HTTPS — same check app.js does.
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'http') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });

  // Shared security middleware (utils/security.js — same module app.js
  // uses, required directly rather than duplicated).
  app.use(security.helmet);
  app.use(security.xssProtection);
  app.use(security.trackConnections);
  app.use(security.securityLogger);

  // Everything path-specific is registered on a router mounted at
  // BASE_PATH rather than on `app` directly, so route matching stays
  // written the same simple bare-path way (`/sso/callback`, not
  // `${BASE_PATH}/sso/callback`) regardless of whether BASE_PATH is set —
  // Express resolves paths relative to the router's mount point. Redirects
  // (`res.redirect(...)`) are the one thing this doesn't cover, since a
  // Location header is browser-absolute, not router-relative — those are
  // built with BASE_PATH explicitly (see ssoRoute.js and the auth gate
  // below).
  const router = express.Router();

  // Rate limits, sized to what each route actually is rather than a blind
  // port of the original's `/api/` prefix match — this app's own /api/me
  // and /api/upload are normal per-message chat traffic, not admin
  // operations, so they get the general limiter; only the two genuinely
  // sensitive admin/device endpoints get the strict one.
  router.use('/sso/callback', security.authLimiter);
  router.use(['/api/me', '/api/upload', '/uploads'], security.standardLimiter);
  router.use('/api/users/bulk-register', security.restrictToAllowedIPs, security.extremeLimiter);
  router.use('/rtsp/upload', security.restrictToAllowedIPs);

  registerSsoRoute(router, BASE_PATH);
  registerUploadRoutes(router);
  registerBulkRegisterRoute(router);

  // Minimal "who am I" endpoint the client chat shell calls once on
  // mount to get the logged-in user's id/name before opening the socket.
  router.get('/api/me', (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    const { _id, username, first_name, last_name } = req.user;
    res.json({ id: _id, username, first_name, last_name });
  });

  // Gate every page render behind auth the same way middleware/index.js's
  // isLoggedIn does, except the login page itself, Next.js's own internal
  // asset requests, and static asset folders (public/svg, public/sounds,
  // public/img) that need to load on the login page itself and before any
  // session exists. The chat shell lives at the router's root
  // (app/page.tsx) — i.e. at exactly BASE_PATH externally — rather than a
  // /chat or /metachat sub-route, so this has to be an exclusion list
  // instead of the narrower prefix match a nested route would allow.
  const PUBLIC_PAGE_PATHS = new Set(['/login']);
  const PUBLIC_PATH_PREFIXES = ['/_next/', '/svg/', '/sounds/', '/img/'];
  router.use((req, res, next) => {
    if (PUBLIC_PAGE_PATHS.has(req.path) || PUBLIC_PATH_PREFIXES.some((p) => req.path.startsWith(p))) {
      return next();
    }
    // Unauthenticated page visit — show our own /login (error message if
    // this came from a failed SSO callback, otherwise just the "Login
    // with PORTAL" button) rather than bouncing straight to the portal;
    // the portal round-trip only happens once the visitor actually clicks
    // through.
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect(`${BASE_PATH}/login`);
    }
    next();
  });

  const sslOptions = loadSslOptions();
  const server = sslOptions ? https.createServer(sslOptions, app) : http.createServer(app);
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
  registerRtspRoute(router, io);

  // No catch-all inside the router — leaving it unmatched routes here
  // falls through to the app-level handler below with req.url restored to
  // its original, unstripped value. Next.js's own basePath handling
  // (next.config.js) expects that full value, not the router-relative one
  // Express would otherwise still have in scope here (mounting a router
  // strips its mount prefix from req.url only while a request is inside
  // it) — routing Next.js's handler from inside the router double-strips
  // BASE_PATH and 404s every page once BASE_PATH is actually set.
  app.use(BASE_PATH || '/', router);
  app.all('*', (req, res) => handle(req, res));

  // Let socket.io see the same session/cookies the HTTP layer parsed.
  io.engine.use(cookieParser());
  io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, (err) => (err ? next(err) : next()));
  });

  registerChatEvents(io);
  registerCallEvents(io);

  server.listen(port, () => {
    const scheme = sslOptions ? 'https' : 'http';
    console.log(`[web-next] ready on ${scheme}://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('[web-next] fatal startup error', err);
  process.exit(1);
});
