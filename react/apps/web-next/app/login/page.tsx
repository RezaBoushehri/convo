const SSO_PORTAL_LOGIN_URL = process.env.SSO_PORTAL_LOGIN_URL || '/portal/login?domain=metachat';

const ERROR_MESSAGES: Record<string, string> = {
  no_sso_token: 'No login token was provided.',
  invalid_sso_token: 'That login link is invalid or has expired.',
  invalid_token_data: 'The login token is missing required data.',
  invalid_domain: 'That login link is not valid for MetaChat.',
  user_not_found: 'No account was found for that login.',
  account_disabled: 'This account has been disabled.',
  session_error: 'Could not start a session. Please try again.',
  session_save_error: 'Could not save your session. Please try again.',
  login_failed: 'Login failed. Please try again.',
  callback_error: 'Something went wrong during login. Please try again.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const message = params.error ? ERROR_MESSAGES[params.error] ?? 'Login failed.' : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
          M
        </div>
        <h1 className="text-lg font-semibold">Sign in to MetaChat</h1>
        <p className="mt-2 text-sm text-slate-500">
          MetaChat is signed into through PORTAL.
        </p>
        {message && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {message}
          </p>
        )}
        {false && (
          <a href={SSO_PORTAL_LOGIN_URL}  className="sso-login-btn mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/portal/svg/logo.svg" alt="" height={12} />
            Login with PORTAL
          </a>
         
        )}
        <p className="mt-4 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-600" role="alert">
          This is a demo version of MetaChat. We are currently in the process of integrating with PORTAL for authentication. Thanks for your patience while we work on this! 
        </p>
      </div>
    </main>
  );
}
