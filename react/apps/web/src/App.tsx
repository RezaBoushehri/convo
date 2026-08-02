import { useState } from 'react';
import { useSocket, useRooms, type CurrentUser } from '@metachat/core';
import RoomList from './components/RoomList';
import ChatWindow from './components/ChatWindow';

// TODO: replace with your real auth flow (the old app read this from
// server-rendered #_id / #username elements). For now it's a tiny local
// login so the app is runnable standalone.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'https://mc.farahoosh.ir/metachat';

function useCurrentUser(): [CurrentUser | null, (u: CurrentUser) => void] {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const raw = localStorage.getItem('MC_currentUser');
    return raw ? JSON.parse(raw) : null;
  });
  const login = (u: CurrentUser) => {
    localStorage.setItem('MC_currentUser', JSON.stringify(u));
    setUser(u);
  };
  return [user, login];
}

function LoginForm({ onLogin }: { onLogin: (u: CurrentUser) => void }) {
  const [username, setUsername] = useState('');
  return (
    <form
      className="login-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!username.trim()) return;
        onLogin({ id: username.trim(), username: username.trim() });
      }}
    >
      <h1>MetaChat</h1>
      <input
        placeholder="نام کاربری"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
      />
      <button type="submit">ورود</button>
    </form>
  );
}

export default function App() {
  const [currentUser, login] = useCurrentUser();
  const [activeRoomID, setActiveRoomID] = useState<string | null>(null);

  const { socket, status } = useSocket({ url: SOCKET_URL }, currentUser);
  const rooms = useRooms(socket);

  if (!currentUser) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className={`conn-status conn-${status}`}>{status}</div>
        <RoomList rooms={rooms} activeRoomID={activeRoomID} onSelect={setActiveRoomID} />
      </aside>
      <main className="chat-pane">
        {activeRoomID ? (
          <ChatWindow socket={socket} roomID={activeRoomID} currentUser={currentUser} />
        ) : (
          <div className="empty-state">یک گفتگو را انتخاب کنید</div>
        )}
      </main>
    </div>
  );
}
