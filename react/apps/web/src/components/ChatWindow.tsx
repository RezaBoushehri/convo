import { useEffect, useRef, useState } from 'react';
import { useChat, type CurrentUser, type MetaChatSocket } from '@metachat/core';
import MessageBubble from './MessageBubble';

interface Props {
  socket: MetaChatSocket | null;
  roomID: string;
  currentUser: CurrentUser;
}

export default function ChatWindow({ socket, roomID, currentUser }: Props) {
  const { messages, joining, sendMessage, retryFailed } = useChat(socket, roomID, currentUser);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft('');
  };

  return (
    <div className="chat-window">
      <div className="message-list">
        {joining && <div className="loading-indicator">در حال بارگذاری...</div>}
        {messages.map((m) => (
          <MessageBubble
            key={m.tempId}
            message={m}
            isOwn={m.sender === currentUser.username}
            onRetry={() => retryFailed(m.tempId)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="message-input-row" onSubmit={submit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="پیام..."
          dir="auto"
        />
        <button type="submit" disabled={!draft.trim()}>
          ارسال
        </button>
      </form>
    </div>
  );
}
