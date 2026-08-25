// Bulk user import — ported from app.js's POST /api/users/bulk-register.
// Imports users with an already-computed passport-local-mongoose salt/hash
// (e.g. migrating accounts from another system), so no plaintext password
// ever passes through this endpoint.
//
// The original route had `return res.status(400)...` as its very first
// statement inside the try block — before the IP check and before any of
// the actual logic — which made it permanently return "please provide an
// array of users" no matter what was sent. That reads like a debug
// leftover rather than an intentional kill switch (disabling a route that
// way would also silently skip the IP-restriction check on every future
// deploy, which isn't how you'd want to gate something this sensitive).
// This port removes that guard and restores the working logic, but you
// may want to double-check this is meant to be live before enabling it in
// production — restrictToAllowedIPs still gates it either way.
const User = require('../../../../models/user');

const INIT_SETTINGS = {};

function registerBulkRegisterRoute(app) {
  app.post('/api/users/bulk-register', async (req, res) => {
    try {
      const { users } = req.body;

      if (!users || !Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ success: false, message: 'Please provide an array of users to register' });
      }
      if (users.length > 100) {
        return res.status(400).json({ success: false, message: 'Maximum 100 users can be registered at once' });
      }

      const results = { successful: [], failed: [] };

      for (const userData of users) {
        try {
          const { username, first_name, last_name, salt, fara_ID, email, phone, hash } = userData;

          if (!username || (!first_name && !last_name) || !fara_ID || !email || !phone || !salt || !hash) {
            results.failed.push({ username: username || 'unknown', reason: 'Missing required fields' });
            continue;
          }

          const existingUser = await User.findOne({ username });
          if (existingUser) {
            results.failed.push({ username, reason: 'Username already exists' });
            continue;
          }

          const newUser = new User({
            username,
            first_name,
            last_name,
            fara_ID,
            email,
            phone,
            salt,
            hash,
            settings: INIT_SETTINGS,
          });
          await newUser.save();

          const userResponse = newUser.toObject();
          delete userResponse.hash;
          delete userResponse.salt;
          delete userResponse.devices;

          results.successful.push(userResponse);
        } catch (error) {
          results.failed.push({ username: userData.username || 'unknown', reason: error.message });
        }
      }

      res.status(201).json({
        success: true,
        message: `Successfully registered ${results.successful.length} out of ${users.length} users`,
        data: results,
      });
    } catch (error) {
      console.error('Bulk registration error:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  });
}

module.exports = { registerBulkRegisterRoute };
