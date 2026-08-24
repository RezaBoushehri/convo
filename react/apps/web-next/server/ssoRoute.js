// The real login path for this app (ported from app.js's GET /sso/callback)
// — the external SSO service redirects here with a signed JWT, we verify
// it, log the user in via passport, and mint the same long-lived
// `autoLogin` cookie the root app uses so socket auth works identically.
const User = require('../../../../models/user');
const { verifySSOToken, encryptAES256 } = require('../../../../services/encryption');

const SSO_SECRET_TOKEN = process.env.SSO_SECRET_TOKEN;
const AUTOLOGIN_KEY = process.env.SECRETKEY_LOGIN || process.env.SOCKET_SECRET_KEY;

function registerSsoRoute(app) {
  app.get('/sso/callback', async (req, res) => {
    try {
      const token = req.query.token;
      if (!token) return res.redirect('/login?error=no_sso_token');

      const verification = verifySSOToken(token, SSO_SECRET_TOKEN);
      if (!verification.valid) return res.redirect('/login?error=invalid_sso_token');

      const { payload } = verification;
      const userId = payload.uid;
      const domain = payload.domain;
      if (!userId || !domain) return res.redirect('/login?error=invalid_token_data');
      if (domain !== 'metachat') return res.redirect('/login?error=invalid_domain');

      const user = await User.findById(userId);
      if (!user) return res.redirect('/login?error=user_not_found');
      if (user.isActive === false) return res.redirect('/login?error=account_disabled');

      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return res.redirect('/login?error=session_error');

        req.login(user, async (loginErr) => {
          if (loginErr) return res.redirect('/login?error=login_failed');

          req.session.sso_logged_in = true;
          req.session.sso_uid = userId;

          try {
            const expMs = Date.now() + 90 * 24 * 60 * 60 * 1000;
            const expires = new Date(expMs);
            const autoLoginToken = encryptAES256(expMs.toString(), AUTOLOGIN_KEY);
            await User.updateOne(
              { _id: user._id },
              {
                $push: {
                  devices: {
                    $each: [
                      {
                        token: autoLoginToken,
                        ip: req.ip,
                        userAgent: req.headers['user-agent'],
                        createdAt: new Date(),
                        expiresAt: expires,
                      },
                    ],
                    $slice: -5,
                  },
                },
              }
            );
            res.cookie('autoLogin', autoLoginToken, {
              httpOnly: true,
              secure: true,
              sameSite: 'lax',
              path: '/',
              expires,
            });
          } catch (err) {
            console.error('SSO device token error', err);
            return res.redirect('/login?error=session_error');
          }

          req.session.save((saveErr) => {
            if (saveErr) return res.redirect('/login?error=session_save_error');
            const redirectPath = payload.redirectPath || req.query.redirect || '/';
            res.redirect(redirectPath === '/' ? '/chat' : redirectPath);
          });
        });
      });
    } catch (err) {
      console.error('SSO callback error', err);
      res.redirect('/login?error=callback_error');
    }
  });

  app.get('/logout', (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.redirect('/login');
      });
    });
  });
}

module.exports = { registerSsoRoute };
