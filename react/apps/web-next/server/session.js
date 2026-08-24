// Session/passport setup, deliberately mirroring the root app.js's
// configuration so a session cookie is interchangeable between the two
// apps as long as SESSION_SECRET matches in both .env files.
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const passport = require('passport');
const User = require('../../../../models/user');

const sessionMiddleware = session({
  store: new MemoryStore({ checkPeriod: 86400000 }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
});

passport.serializeUser(User.serializeUser());
passport.deserializeUser(async (username, done) => {
  try {
    const user = await User.findByUsername(username);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = { sessionMiddleware, passport };
