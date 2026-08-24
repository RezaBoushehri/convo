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
