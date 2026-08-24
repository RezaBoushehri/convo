'use client';

import { useMemo, useState } from 'react';
import type { ChatMessage, MessageFile, RoomMember } from '@/lib/types';
import AudioPlayer from './AudioPlayer';
import VideoNotePlayer from './VideoNotePlayer';
import ReactionPicker from './ReactionPicker';

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

function isVideoNote(f: MessageFile) {
  return f.fileType.startsWith('video/') && (f.fileName || '').includes('videonote');
}

function FileAttachment({
  file,
  tone,
  isOwn,
  onVoiceHeard,
}: {
  file: MessageFile;
  tone: 'light' | 'dark';
  isOwn: boolean;
  onVoiceHeard: () => void;
}) {
  if (isVideoNote(file)) return <VideoNotePlayer src={file.file} />;
  if (file.fileType.startsWith('image/')) {
    return (
      <a href={file.file} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={file.file} alt={file.fileName || 'image'} className="max-h-64 max-w-xs rounded-xl object-cover" />
      </a>
    );
  }
  if (file.fileType.startsWith('audio/')) {
    return (
      <div onClick={onVoiceHeard} className="flex items-center gap-1.5">
        <AudioPlayer src={file.file} tone={tone} />
        {isOwn && file.heardBy && file.heardBy.length > 0 && (
          <span title="Heard">
            <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 shrink-0 ${tone === 'dark' ? 'text-white/70' : 'text-brand'}`} fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>
    );
  }
  if (file.fileType.startsWith('video/')) {
    return <video src={file.file} controls preload="metadata" className="max-h-64 max-w-xs rounded-xl" />;
  }
  return (
    <a
      href={file.file}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${tone === 'dark' ? 'bg-white/15 text-white' : 'bg-slate-50 text-slate-600'}`}
    >
      <span>📎</span>
      <span className="truncate">{file.fileName || file.fileType}</span>
    </a>
  );
}

export interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  sender: RoomMember | null;
  usersById: Map<string, RoomMember>;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onVoiceHeard: (fileId: string) => void;
  currentUserId: string | undefined;
}

export default function MessageBubble({
  message,
  isOwn,
  sender,
  usersById,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReact,
  onVoiceHeard,
  currentUserId,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const senderName = isOwn ? 'You' : sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown';
  const tone = isOwn ? 'dark' : 'light';

  const reactionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let mine: string | null = null;
    (message.read || []).forEach((r) => {
      if (!r.reaction) return;
      counts.set(r.reaction, (counts.get(r.reaction) || 0) + 1);
      if (r.username === currentUserId) mine = r.reaction;
    });
    return { counts, mine };
  }, [message.read, currentUserId]);

  const isTextOnly = !message.file?.length && !message.forward;

  return (
    <div className={`group flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className={`mb-1 flex items-center gap-2 text-xs text-slate-400 ${isOwn ? 'flex-row-reverse' : ''}`}>
        {!isOwn && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-[10px] font-semibold text-brand-dark">
            {initials(senderName) || '·'}
          </span>
        )}
        <span className="font-medium text-slate-600">{senderName}</span>
        <span>{timeLabel(message.timestamp)}</span>
        {message.edited && <span className="italic">edited</span>}
        {isOwn && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
            {initials(senderName) || 'Y'}
          </span>
        )}
      </div>

      <div className={`flex items-end gap-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <div
          className={`relative max-w-md whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
            isOwn ? 'rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm border border-slate-100 bg-white text-slate-700'
          }`}
        >
          {message.forward && (
            <div className={`mb-1.5 border-l-2 pl-2 text-xs italic ${isOwn ? 'border-white/40 text-white/70' : 'border-slate-300 text-slate-400'}`}>
              Forwarded from {message.forward.senderName || 'Unknown'}
            </div>
          )}
          {message.reply && (
            <div className={`mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs ${isOwn ? 'border-white/40 bg-white/10 text-white/80' : 'border-brand/50 bg-brand-light text-slate-500'}`}>
              {message.reply.message || (message.reply.file ? '📎 Attachment' : '')}
            </div>
          )}

          {message.message && <div>{message.message}</div>}

          {message.file && message.file.length > 0 && (
            <div className={`space-y-1.5 ${message.message ? 'mt-2' : ''}`}>
              {message.file.map((f) => (
                <FileAttachment key={f._id} file={f} tone={tone} isOwn={isOwn} onVoiceHeard={() => onVoiceHeard(f._id)} />
              ))}
            </div>
          )}
        </div>

        <div className="relative flex opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-500"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>
          {menuOpen && (
            <div
              className={`absolute top-6 z-10 w-36 rounded-xl border border-slate-100 bg-white py-1 text-sm shadow-lg ${isOwn ? 'right-0' : 'left-0'}`}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={() => {
                  setPickerOpen(true);
                  setMenuOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left hover:bg-slate-50"
              >
                React
              </button>
              <button
                onClick={() => {
                  onReply(message);
                  setMenuOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left hover:bg-slate-50"
              >
                Reply
              </button>
              <button
                onClick={() => {
                  onForward(message);
                  setMenuOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left hover:bg-slate-50"
              >
                Forward
              </button>
              {isOwn && isTextOnly && (
                <button
                  onClick={() => {
                    onEdit(message);
                    setMenuOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left hover:bg-slate-50"
                >
                  Edit
                </button>
              )}
              {isOwn && (
                <button
                  onClick={() => {
                    onDelete(message);
                    setMenuOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          )}
          {pickerOpen && (
            <div className={`absolute top-6 z-10 ${isOwn ? 'right-0' : 'left-0'}`} onMouseLeave={() => setPickerOpen(false)}>
              <ReactionPicker
                onPick={(emoji) => {
                  onReact(message.id, emoji);
                  setPickerOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {reactionCounts.counts.size > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.from(reactionCounts.counts.entries()).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
                reactionCounts.mine === emoji ? 'border-brand bg-brand-light' : 'border-slate-100 bg-white'
              }`}
            >
              <span>{emoji}</span>
              {count > 1 && <span className="text-slate-400">{count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
