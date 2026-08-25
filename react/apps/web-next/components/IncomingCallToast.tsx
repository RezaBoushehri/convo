'use client';

import type { IncomingCallPayload } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function IncomingCallToast({
  call,
  onAccept,
  onDecline,
}: {
  call: IncomingCallPayload;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed left-1/2 top-6 z-[1090] flex w-[92%] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold">
        {initials(call.caller.fullName) || '·'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{call.caller.fullName}</p>
        <p className="text-xs text-white/60">{call.callType === 'video' ? 'Incoming video call' : 'Incoming voice call'}</p>
      </div>
      <button onClick={onDecline} title="Decline" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" style={{ transform: 'rotate(135deg)' }}>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
      </button>
      <button onClick={onAccept} title="Accept" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
      </button>
    </div>
  );
}
