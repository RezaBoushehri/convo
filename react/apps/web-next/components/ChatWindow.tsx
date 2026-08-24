'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, CurrentUser, RoomMember, RoomSummary, TypingPayload } from '@/lib/types';
import MessageBubble from './MessageBubble';
import { roomDisplayName } from './Sidebar';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function dateLabel(date: string) {
  const d = new Date(date);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return 'Today';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
}

interface ChatWindowProps {
  room: RoomSummary | null;
  currentUser: CurrentUser | null;
  messages: ChatMessage[];
  members: RoomMember[];
  usersById: Map<string, RoomMember>;
  typingUser: TypingPayload | null;
  onSend: (text: string) => void;
  onDraftChange: (text: string) => void;
}

export default function ChatWindow({ room, currentUser, messages, members, usersById, typingUser, onSend, onDraftChange }: ChatWindowProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, room?.roomID]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: ChatMessage[] }[] = [];
    for (const msg of messages) {
      const label = dateLabel(msg.timestamp);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(msg);
      else groups.push({ label, items: [msg] });
    }
    return groups;
  }, [messages]);

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        Select a conversation to start chatting.
      </div>
    );
  }

  const name = roomDisplayName(room, currentUser, usersById);
  const preview = members.slice(0, 3);

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
            {initials(name) || '·'}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{name}</p>
            <p className="text-xs text-emerald-500">
              {typingUser?.isTyping ? `${typingUser.name || typingUser.username} typing…` : ' '}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {preview.map((m) => (
              <div
                key={m._id}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-light text-[10px] font-semibold text-brand-dark"
              >
                {initials(`${m.first_name} ${m.last_name}`)}
              </div>
            ))}
          </div>
          <button title="Video call" className="text-slate-400 hover:text-slate-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M23 7l-7 5 7 5V7z" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </button>
          <button title="Call" className="text-slate-400 hover:text-slate-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button title="More" className="text-slate-400 hover:text-slate-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 no-scrollbar">
        {grouped.map((group) => (
          <div key={group.label}>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs text-slate-400">{group.label}</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <div className="space-y-4">
              {group.items.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender === currentUser?.id}
                  sender={usersById.get(msg.sender) ?? null}
                />
              ))}
            </div>
          </div>
        ))}
        {messages.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No messages yet — say hi!</p>}
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
          <button title="Voice message (coming soon)" disabled className="text-slate-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v1a7 7 0 0014 0v-1M12 18v4" strokeLinecap="round" />
            </svg>
          </button>
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              onDraftChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Add a comment…"
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          <button title="Attach (coming soon)" disabled className="text-slate-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={submit} title="Send" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
