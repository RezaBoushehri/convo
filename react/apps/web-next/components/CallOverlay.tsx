'use client';

import { useEffect, useRef } from 'react';
import type { CallParticipant, CallType, CurrentUser } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatElapsed(ms: number) {
  const secs = Math.floor(ms / 1000);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function connectionLabel(state: RTCPeerConnectionState | undefined) {
  if (!state || state === 'new' || state === 'connecting') return 'Connecting…';
  if (state === 'disconnected') return 'Reconnecting…';
  if (state === 'failed' || state === 'closed') return 'Disconnected';
  return null;
}

function RemoteTile({
  participant,
  stream,
  connectionState,
  isVideo,
}: {
  participant: CallParticipant;
  stream: MediaStream | undefined;
  connectionState: RTCPeerConnectionState | undefined;
  isVideo: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  const status = connectionLabel(connectionState);

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-slate-800">
      {isVideo && <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />}
      {(!isVideo || !stream) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
            {initials(participant.fullName) || '·'}
          </div>
          <span className="text-sm font-medium">{participant.fullName}</span>
        </div>
      )}
      {isVideo && (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">{participant.fullName}</span>
      )}
      {status && (
        <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white">{status}</span>
      )}
    </div>
  );
}

export default function CallOverlay({
  currentUser,
  callType,
  participants,
  localStream,
  remoteStreams,
  connectionStates,
  muted,
  cameraOff,
  elapsedMs,
  onToggleMute,
  onToggleCamera,
  onHangUp,
}: {
  currentUser: CurrentUser | null;
  callType: CallType | null;
  participants: CallParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  connectionStates: Map<string, RTCPeerConnectionState>;
  muted: boolean;
  cameraOff: boolean;
  elapsedMs: number;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  const isVideo = callType === 'video';
  const connecting = participants.length === 0;

  return (
    <div className="fixed inset-0 z-[1080] flex flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-medium">{isVideo ? 'Video call' : 'Voice call'}</span>
        <span className="font-mono text-sm tabular-nums text-white/70">{elapsedMs > 0 ? formatElapsed(elapsedMs) : connecting ? 'Ringing…' : ''}</span>
      </div>

      <div className="relative min-h-0 flex-1 px-6 pb-4">
        {participants.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/60">Waiting for others to join…</div>
        ) : (
          <div
            className="grid h-full gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(participants.length, participants.length > 4 ? 3 : 2)}, 1fr)` }}
          >
            {participants.map((p) => (
              <RemoteTile
                key={p.socketId}
                participant={p}
                stream={remoteStreams.get(p.socketId)}
                connectionState={connectionStates.get(p.socketId)}
                isVideo={isVideo}
              />
            ))}
          </div>
        )}

        {/* local PiP */}
        <div className="absolute bottom-4 right-4 flex h-28 w-20 items-center justify-center overflow-hidden rounded-xl bg-slate-800 shadow-lg sm:h-36 sm:w-28">
          {isVideo && !cameraOff ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold">
              {currentUser ? initials(`${currentUser.first_name} ${currentUser.last_name}`) : 'Y'}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 pb-8 pt-2">
        <button
          onClick={onToggleMute}
          title={muted ? 'Unmute' : 'Mute'}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${muted ? 'bg-white text-slate-900' : 'bg-white/15 text-white'}`}
        >
          {muted ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M1 1l22 22M9 9v3a3 3 0 005 2.24M15 9.34V5a3 3 0 00-5.94-.6M17 16.95A7 7 0 015 12v-2m14 2v-2M12 19v3M8 22h8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v1a7 7 0 0014 0v-1M12 18v4" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {isVideo && (
          <button
            onClick={onToggleCamera}
            title={cameraOff ? 'Turn camera on' : 'Turn camera off'}
            className={`flex h-12 w-12 items-center justify-center rounded-full ${cameraOff ? 'bg-white text-slate-900' : 'bg-white/15 text-white'}`}
          >
            {cameraOff ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M1 1l22 22M21 7l-4 3v-3a2 2 0 00-2-2H8m-4.73 0A2 2 0 003 8v8a2 2 0 002 2h9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M23 7l-7 5 7 5V7z" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
            )}
          </button>
        )}

        <button onClick={onHangUp} title="End call" className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" style={{ transform: 'rotate(135deg)' }}>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
