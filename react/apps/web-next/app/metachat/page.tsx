import ChatApp from '@/components/ChatApp';

// Auth is already enforced by server.js before this route is ever
// reached (see the app.get(['/metachat', '/metachat/*'], ...) gate) —
// this page just renders the client shell.
export default function ChatPage() {
  return <ChatApp />;
}
