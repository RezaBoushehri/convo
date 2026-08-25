// The real login path for this app (ported from app.js's GET /sso/callback)
// — the external SSO service redirects here with a signed JWT, we verify
// it, log the user in via passport, and mint the same long-lived
// `autoLogin` cookie the root app uses so socket auth works identically.
const User = require('../../../../models/user');
const { verifySSOToken, encryptAES256 } = require('../../../../services/encryption');

const SSO_SECRET_TOKEN = process.env.SSO_SECRET_TOKEN;
const AUTOLOGIN_KEY = process.env.SECRETKEY_LOGIN || process.env.SOCKET_SECRET_KEY;

function registerSsoRoute(app, basePath = '') {
  const loginRedirect = (res, query = '') => res.redirect(`${basePath}/login${query}`);

  app.get('/sso/callback', async (req, res) => {
    try {
      const token = req.query.token;
      if (!token) return loginRedirect(res, '?error=no_sso_token');

      const verification = verifySSOToken(token, SSO_SECRET_TOKEN);
      if (!verification.valid) return loginRedirect(res, '?error=invalid_sso_token');

      const { payload } = verification;
      const userId = payload.uid;
      const domain = payload.domain;
      if (!userId || !domain) return loginRedirect(res, '?error=invalid_token_data');
      if (domain !== 'metachat') return loginRedirect(res, '?error=invalid_domain');

      const user = await User.findById(userId);
      if (!user) return loginRedirect(res, '?error=user_not_found');
      if (user.isActive === false) return loginRedirect(res, '?error=account_disabled');

      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return loginRedirect(res, '?error=session_error');

        req.login(user, async (loginErr) => {
          if (loginErr) return loginRedirect(res, '?error=login_failed');

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
            return loginRedirect(res, '?error=session_error');
          }

          req.session.save((saveErr) => {
            if (saveErr) return loginRedirect(res, '?error=session_save_error');
            // '/' means "app root" from the SSO issuer's point of view — map
            // that to our actual root (basePath, since the chat shell lives
            // there). Any other explicit redirectPath is an external
            // contract with the SSO issuer and is left as-is.
            const redirectPath = payload.redirectPath || req.query.redirect || '/';
            res.redirect(redirectPath === '/' ? basePath || '/' : redirectPath);
          });
        });
      });
    } catch (err) {
      console.error('SSO callback error', err);
      loginRedirect(res, '?error=callback_error');
    }
  });

  app.get('/logout', (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        loginRedirect(res);
      });
    });
  });
}

module.exports = { registerSsoRoute };
