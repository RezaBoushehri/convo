'use client';

import type { ChatMessage, RoomMember } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function timeLabel(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({
  message,
  isOwn,
  sender,
}: {
  message: ChatMessage;
  isOwn: boolean;
  sender: RoomMember | null;
}) {
  const senderName = isOwn ? 'You' : sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown';

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className={`mb-1 flex items-center gap-2 text-xs text-slate-400 ${isOwn ? 'flex-row-reverse' : ''}`}>
        {!isOwn && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-[10px] font-semibold text-brand-dark">
            {initials(senderName) || '·'}
          </span>
        )}
        <span className="font-medium text-slate-600">{senderName}</span>
        <span>{timeLabel(message.timestamp)}</span>
        {isOwn && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
            {initials(senderName) || 'Y'}
          </span>
        )}
      </div>

      <div
        className={`max-w-md whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isOwn
            ? 'rounded-tr-sm bg-brand text-white'
            : 'rounded-tl-sm border border-slate-100 bg-white text-slate-700'
        }`}
      >
        {message.message || (message.file?.length ? '' : ' ')}
        {message.file && message.file.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.file.map((f, i) => (
              <div
                key={i}
                className={`rounded-lg px-2 py-1 text-xs ${isOwn ? 'bg-white/15 text-white' : 'bg-slate-50 text-slate-600'}`}
              >
                📎 {f.fileName || f.fileType}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
