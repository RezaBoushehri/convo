'use client';

import { useMemo, useState } from 'react';
import type { CurrentUser, RoomMember, RoomSummary } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function timeLabel(date?: string) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function roomDisplayName(room: RoomSummary, currentUser: CurrentUser | null, usersById: Map<string, RoomMember>) {
  const isPv = room.setting?.[0]?.type === 'PV_chat';
  if (isPv && currentUser) {
    const otherId = room.members.find((id) => id !== currentUser.id);
    const other = otherId ? usersById.get(otherId) : null;
    if (other) return `${other.first_name} ${other.last_name}`;
  }
  return room.roomName || 'Untitled room';
}

interface SidebarProps {
  currentUser: CurrentUser | null;
  rooms: RoomSummary[];
  usersById: Map<string, RoomMember>;
  activeRoomID: string | null;
  unreadByRoom: Map<string, number>;
  typingByRoom: Map<string, string>;
  onSelectRoom: (roomID: string) => void;
}

export default function Sidebar({ currentUser, rooms, usersById, activeRoomID, unreadByRoom, typingByRoom, onSelectRoom }: SidebarProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return rooms;
    const q = query.toLowerCase();
    return rooms.filter((room) => roomDisplayName(room, currentUser, usersById).toLowerCase().includes(q));
  }, [rooms, query, currentUser, usersById]);

  return (
    <div
      className={`${
        activeRoomID ? 'hidden' : 'flex'
      } w-full shrink-0 flex-col border-r border-slate-100 bg-white md:flex md:w-[320px]`}
    >
      <div className="px-5 pb-4 pt-6">
        <h1 className="text-xl font-bold text-slate-900">Messages</h1>
        <div className="relative mt-4">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-full bg-slate-100 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-2 pb-4">
        <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">All Messages</div>
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-slate-400">
            {rooms.length === 0 ? 'No conversations yet.' : 'No matches.'}
          </p>
        )}
        {filtered.map((room) => {
          const name = roomDisplayName(room, currentUser, usersById);
          const unread = unreadByRoom.get(room.roomID) ?? 0;
          const typingName = typingByRoom.get(room.roomID);
          const active = room.roomID === activeRoomID;

          return (
            <button
              key={room.roomID}
              onClick={() => onSelectRoom(room.roomID)}
              className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                active ? 'bg-brand-light' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                {initials(name) || '·'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{name}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{timeLabel(room.lastUpdated)}</span>
                </div>
                <p className={`truncate text-xs ${typingName ? 'italic text-emerald-500' : 'text-slate-400'}`}>
                  {typingName ? `${typingName} typing…` : room.lastMessage?.message || 'No messages yet'}
                </p>
              </div>
              {unread > 0 && (
                <span className="ml-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
