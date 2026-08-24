'use client';

import type { CurrentUser } from '@/lib/types';

const ICONS = [
  { key: 'grid', label: 'Dashboard', path: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
  { key: 'tasks', label: 'Tasks', path: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
  { key: 'folder', label: 'Files', path: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z' },
  { key: 'phone', label: 'Calls', path: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z' },
] as const;

export default function IconRail({ currentUser }: { currentUser: CurrentUser | null }) {
  return (
    <div className="hidden w-[76px] shrink-0 flex-col items-center gap-2 border-r border-slate-100 bg-white py-6 md:flex">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
        M
      </div>

      {ICONS.map((icon) => (
        <button
          key={icon.key}
          title={icon.label}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d={icon.path} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}

      <button title="Chat" className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path
            d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button title="People" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path
            d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="mt-auto flex flex-col items-center gap-3">
        <button title="Settings" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-light text-xs font-semibold text-brand-dark">
          {currentUser ? `${currentUser.first_name?.[0] ?? ''}${currentUser.last_name?.[0] ?? ''}` : '…'}
        </div>
      </div>
    </div>
  );
}
