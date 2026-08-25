// Connects to the same MongoDB database the existing Express app uses.
// Mongoose models are required directly from the repo's shared models/
// directory (not duplicated here) so both apps stay schema-compatible by
// construction.
const mongoose = require('mongoose');

let connectPromise = null;

function connectDB() {
  if (connectPromise) return connectPromise;

  const { DB_USERNAME, DB_PASSWORD, MONGO_URI } = process.env;
  const encodedPassword = encodeURIComponent(DB_PASSWORD || '');
  const uri = `mongodb://${DB_USERNAME}:${encodedPassword}@${MONGO_URI}/chatRoom?authSource=chatRoom`;

  // Logged so a later "Operation ... buffering timed out" (queries queue
  // silently while disconnected, then fail after serverSelectionTimeoutMS
  // with no context of their own) can be matched up against when/why the
  // connection actually dropped, instead of showing up as an unexplained
  // one-off.
  mongoose.connection.on('disconnected', () => console.error('[web-next] MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[web-next] MongoDB reconnected'));
  mongoose.connection.on('error', (err) => console.error('[web-next] MongoDB connection error (post-connect):', err.message));

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
