'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/types';
import RecordButton from './RecordButton';

export interface ComposerProps {
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  editingMessage: ChatMessage | null;
  onCancelEdit: () => void;
  onSendText: (text: string) => void;
  onSendFiles: (files: File[], caption: string) => void;
  onSendVoice: (blob: Blob) => void;
  onSendVideo: (blob: Blob) => void;
  onSaveEdit: (messageId: string, text: string) => void;
  onDraftChange: (text: string) => void;
  disabled?: boolean;
  uploadProgress: number | null;
}

export default function Composer({
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSendText,
  onSendFiles,
  onSendVoice,
  onSendVideo,
  onSaveEdit,
  onDraftChange,
  disabled,
  uploadProgress,
}: ComposerProps) {
  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMessage) setDraft(editingMessage.message);
  }, [editingMessage]);

  function submit() {
    const text = draft.trim();
    if (editingMessage) {
      if (text) onSaveEdit(editingMessage.id, text);
      setDraft('');
      return;
    }
    if (pendingFiles.length) {
      onSendFiles(pendingFiles, text);
      setPendingFiles([]);
      setDraft('');
      return;
    }
    if (!text) return;
    onSendText(text);
    setDraft('');
  }

  const hasContent = draft.trim().length > 0 || pendingFiles.length > 0;

  return (
    <div className="border-t border-slate-100 px-6 py-4">
      {(replyTo || editingMessage) && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
          <div className="min-w-0">
            <p className="font-medium text-brand-dark">{editingMessage ? 'Editing message' : 'Replying'}</p>
            <p className="truncate text-slate-500">{(editingMessage || replyTo)?.message || '📎 Attachment'}</p>
          </div>
          <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="ml-2 shrink-0 text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
              <span className="max-w-[140px] truncate">{f.name}</span>
              <button onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadProgress != null && (
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-brand transition-all" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
        <RecordButton onSendVoice={onSendVoice} onSendVideo={onSendVideo} disabled={disabled || !!editingMessage} />

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
            if (e.key === 'Escape' && editingMessage) onCancelEdit();
          }}
          placeholder={editingMessage ? 'Edit message…' : 'Add a comment…'}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) setPendingFiles((prev) => [...prev, ...files]);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || !!editingMessage}
          title="Attach"
          className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path
              d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={submit}
          disabled={disabled || !hasContent}
          title="Send"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
