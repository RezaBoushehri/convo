'use client';

import { useState } from 'react';
import type { RoomMember, RoomSummary } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export interface AttachmentsSummary {
  document: { count: number; bytes: number };
  photo: { count: number; bytes: number };
  video: { count: number; bytes: number };
  other: { count: number; bytes: number };
}

const CATEGORY_META = [
  { key: 'document' as const, label: 'Document', icon: '📄' },
  { key: 'photo' as const, label: 'Photo', icon: '🖼️' },
  { key: 'video' as const, label: 'Videos', icon: '🎬' },
  { key: 'other' as const, label: 'Other Files', icon: '📁' },
];

export default function RightPanel({
  room,
  members,
  attachments,
}: {
  room: RoomSummary | null;
  members: RoomMember[];
  attachments: AttachmentsSummary | null;
}) {
  const [membersOpen, setMembersOpen] = useState(true);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);

  if (!room) {
    return <div className="hidden w-[300px] shrink-0 border-l border-slate-100 bg-white xl:block" />;
  }

  return (
    <div className="hidden w-[300px] shrink-0 flex-col overflow-y-auto border-l border-slate-100 bg-white px-5 py-6 no-scrollbar xl:flex">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
          {initials(room.roomName) || 'M'}
        </div>
        <h2 className="mt-3 text-base font-semibold text-slate-800">{room.roomName}</h2>
        <p className="text-xs text-slate-400">{members.length} member{members.length === 1 ? '' : 's'}</p>
      </div>

      <div className="mt-8">
        <button
          onClick={() => setMembersOpen((v) => !v)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          Members
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${membersOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="mt-3 text-sm font-medium text-brand hover:text-brand-dark">+ Add Member</button>

        {membersOpen && (
          <div className="mt-3 space-y-3">
            {members.map((m) => (
              <div key={m._id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand-dark">
                  {initials(`${m.first_name} ${m.last_name}`)}
                </div>
                <span className="text-sm text-slate-700">
                  {m.first_name} {m.last_name}
                </span>
                {m.status === 'online' && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <button
          onClick={() => setAttachmentsOpen((v) => !v)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          Attachments
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${attachmentsOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {attachmentsOpen && (
          <div className="mt-3 space-y-3">
            {CATEGORY_META.map(({ key, label, icon }) => {
              const stats = attachments?.[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm">{icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400">{stats ? `${stats.count} file${stats.count === 1 ? '' : 's'}` : '…'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
