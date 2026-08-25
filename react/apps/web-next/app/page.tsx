import { redirect } from 'next/navigation';

export default function Home() {
  // /metachat is gated by server.js's auth check (mirrors the root app's
  // isLoggedIn middleware) — an unauthenticated visitor bounces to
  // /login before this page is ever reached for that path.
  redirect('/metachat');
}
