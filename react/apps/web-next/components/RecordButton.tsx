'use client';

import { useCallback, useRef, useState } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import VideoNoteOverlay from './VideoNoteOverlay';

const RECORD_HOLD_THRESHOLD = 150; // ms — a plain tap shouldn't start recording
const RECORD_CANCEL_THRESHOLD = 80; // px dragged left to cancel
const RECORD_LOCK_THRESHOLD = 60; // px dragged up to lock (hands-free)

type Mode = 'voice' | 'video';

export default function RecordButton({
  onSendVoice,
  onSendVideo,
  disabled,
}: {
  onSendVoice: (blob: Blob) => void;
  onSendVideo: (blob: Blob) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('voice');
  const [locked, setLocked] = useState(false);
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const voice = useVoiceRecorder();

  const pressTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPressed = useRef(false);
  const canceled = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const slideRef = useRef<HTMLDivElement>(null);

  const beginRecordPress = useCallback(async () => {
    if (!isPressed.current) return; // released before the hold threshold fired

    if (mode === 'video') {
      isPressed.current = false;
      setShowVideoOverlay(true);
      return;
    }

    try {
      await voice.start();
    } catch (err) {
      isPressed.current = false;
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : 'Could not start recording.');
    }
  }, [mode, voice]);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || voice.recording || showVideoOverlay || isPressed.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startX.current = e.clientX;
    startY.current = e.clientY;
    isPressed.current = true;
    canceled.current = false;
    setLocked(false);
    pressTimeoutId.current = setTimeout(() => {
      pressTimeoutId.current = null;
      beginRecordPress();
    }, RECORD_HOLD_THRESHOLD);
  }

  function resetSlide() {
    if (slideRef.current) {
      slideRef.current.style.transform = 'translateX(0)';
      slideRef.current.style.opacity = '1';
    }
  }

  async function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isPressed.current || locked || mode !== 'voice' || !voice.recording) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (dy < -RECORD_LOCK_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      setLocked(true);
      resetSlide();
      return;
    }

    if (dx < 0) {
      const progress = Math.min(1, Math.abs(dx) / RECORD_CANCEL_THRESHOLD);
      if (slideRef.current) {
        slideRef.current.style.transform = `translateX(${dx}px)`;
        slideRef.current.style.opacity = String(1 - progress * 0.7);
      }
      if (Math.abs(dx) >= RECORD_CANCEL_THRESHOLD) {
        canceled.current = true;
        isPressed.current = false;
        resetSlide();
        await voice.finish(false);
      }
    } else {
      resetSlide();
    }
  }

  async function onPointerUp() {
    if (pressTimeoutId.current) {
      clearTimeout(pressTimeoutId.current);
      pressTimeoutId.current = null;
      isPressed.current = false;
      // Plain tap (released before the hold threshold): swap mode.
      if (mode === 'video' ? !showVideoOverlay : !voice.recording) {
        setMode((m) => (m === 'voice' ? 'video' : 'voice'));
      }
      return;
    }
    if (!isPressed.current) return;
    isPressed.current = false;
    if (mode === 'video') return; // finished via the overlay's own buttons
    if (locked || canceled.current) return; // waiting on the locked controls, or already canceled mid-drag
    resetSlide();
    const blob = await voice.finish(true);
    if (blob) onSendVoice(blob);
  }

  async function lockedSend() {
    setLocked(false);
    const blob = await voice.finish(true);
    if (blob) onSendVoice(blob);
  }

  async function lockedCancel() {
    setLocked(false);
    await voice.finish(false);
  }

  const seconds = Math.floor(voice.elapsedMs / 1000);
  const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="relative flex items-center gap-2">
      {voice.recording && !locked && (
        <>
          <span className="text-xs tabular-nums text-red-500">{timeLabel}</span>
          <div ref={slideRef} className="flex items-center gap-1 text-xs text-slate-400 transition-opacity">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="whitespace-nowrap">Slide to cancel</span>
          </div>
        </>
      )}

      {locked && (
        <>
          <span className="text-xs tabular-nums text-red-500">{timeLabel}</span>
          <button onClick={lockedCancel} title="Discard" className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M6 7h12l-1 13H7L6 7zm3-4h6l1 2H8l1-2z" />
            </svg>
          </button>
          <button onClick={lockedSend} title="Send" className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {!locked && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          disabled={disabled}
          title={voice.recording ? undefined : 'Tap to switch voice/video, hold to record'}
          style={{ touchAction: 'none' }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition ${
            voice.recording ? 'bg-red-500' : 'bg-brand'
          } disabled:opacity-40`}
        >
          {mode === 'voice' ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v1a7 7 0 0014 0v-1M12 18v4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M23 7l-7 5 7 5V7z" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          )}
        </button>
      )}

      {showVideoOverlay && (
        <VideoNoteOverlay
          onSend={(blob) => {
            setShowVideoOverlay(false);
            onSendVideo(blob);
          }}
          onCancel={() => setShowVideoOverlay(false)}
        />
      )}
    </div>
  );
}
