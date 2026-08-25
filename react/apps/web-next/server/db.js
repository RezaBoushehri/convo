// Connects to the same MongoDB database the existing Express app uses.
// Mongoose models are required directly from the repo's shared models/
// directory (not duplicated here) so both apps stay schema-compatible by
// construction.
const mongoose = require('mongoose');

let connectPromise = null;

const READY_STATE_NAMES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting', 99: 'uninitialized' };

function connectDB() {
  if (connectPromise) return connectPromise;

  const { DB_USERNAME, DB_PASSWORD, MONGO_URI } = process.env;
  const encodedPassword = encodeURIComponent(DB_PASSWORD || '');
  const uri = `mongodb://${DB_USERNAME}:${encodedPassword}@${MONGO_URI}/chatRoom?authSource=chatRoom`;

  // TEMP diagnostics for a live "buffering timed out" investigation —
  // confirms which config this process actually loaded (host/user, not
  // the password) and what PID/cwd it's running as, since a process
  // manager can launch this from an unexpected working directory.
  console.log('[web-next][diag] pid=%s cwd=%s', process.pid, process.cwd());
  console.log('[web-next][diag] DB target: user=%s host=%s (password %s)', DB_USERNAME, MONGO_URI, DB_PASSWORD ? 'set, len=' + DB_PASSWORD.length : 'MISSING');

  // Logged so a later "Operation ... buffering timed out" (queries queue
  // silently while disconnected, then fail after serverSelectionTimeoutMS
  // with no context of their own) can be matched up against when/why the
  // connection actually dropped, instead of showing up as an unexplained
  // one-off.
  mongoose.connection.on('disconnected', () => console.error('[web-next] MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[web-next] MongoDB reconnected'));
  mongoose.connection.on('error', (err) => console.error('[web-next] MongoDB connection error (post-connect):', err.message));

  // TEMP: readyState heartbeat every 5s so we can see whether the
  // connection is ever NOT "connected" between requests, even when no
  // disconnected/reconnected event fires for it.
  // setInterval(() => {
  //   const state = mongoose.connection.readyState;
  //   console.log('[web-next][diag] mongo readyState=%s (%s)', state, READY_STATE_NAMES[state] || 'unknown');
  // }, 5000).unref();

  connectPromise = mongoose
    .connect(uri, {})
    .then(() => console.log('[web-next] MongoDB connected'))
    .catch((err) => {
      console.error('[web-next] MongoDB connection error:', err.message);
      throw err;
    });

  return connectPromise;
}

module.exports = { connectDB };
