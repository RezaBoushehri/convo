'use client';

import { useState } from 'react';
import type { CurrentUser, RoomMember, RoomSummary } from '@/lib/types';
import { roomDisplayName } from './Sidebar';

export default function ForwardDialog({
  rooms,
  currentUser,
  usersById,
  onForward,
  onClose,
}: {
  rooms: RoomSummary[];
  currentUser: CurrentUser | null;
  usersById: Map<string, RoomMember>;
  onForward: (roomID: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = rooms.filter((r) => roomDisplayName(r, currentUser, usersById).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Forward to…</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="mb-3 w-full rounded-full bg-slate-100 px-3 py-2 text-sm focus:outline-none"
        />
        <div className="max-h-72 space-y-1 overflow-y-auto no-scrollbar">
          {filtered.map((room) => (
            <button
              key={room.roomID}
              onClick={() => onForward(room.roomID)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {roomDisplayName(room, currentUser, usersById).slice(0, 1).toUpperCase()}
              </span>
              {roomDisplayName(room, currentUser, usersById)}
            </button>
          ))}
          {filtered.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No conversations found.</p>}
        </div>
        <button onClick={onClose} className="mt-3 w-full rounded-full bg-slate-100 py-2 text-sm text-slate-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
