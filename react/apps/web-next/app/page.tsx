import ChatApp from '@/components/ChatApp';

// Auth is already enforced by server.js before this route is ever
// reached (see the auth-gate middleware in server.js) — this page just
// renders the client shell. Lives at the app's root (not a /chat or
// /metachat sub-route) so that with BASE_PATH set, the external URL is
// simply <BASE_PATH>/ — see next.config.js and .env.example.
export default function Home() {
  return <ChatApp />;
}
