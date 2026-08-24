'use client';

import { useEffect, useRef, useState } from 'react';

const CANVAS_SIZE = 480;

// Telegram-style round video message recorder: a live circular preview
// with a heavily blurred glow of the same feed behind it, and a flip
// button to switch cameras mid-recording.
//
// The MediaRecorder here is bound to a <canvas> capture stream (+ the mic
// track) rather than the raw camera stream directly. That's deliberate:
// the MediaStream Recording spec requires a recorder to stop with an
// error the instant a track is added to/removed from the stream it's
// recording, so swapping the camera track live on the recorder's own
// stream (the naive approach) breaks the recording. Painting the active
// camera onto a canvas each frame and recording *that* means the
// recorder's stream never changes tracks — only what's drawn onto the
// canvas changes — so flipping cameras never interrupts the recording.
export default function VideoNoteOverlay({ onSend, onCancel }: { onSend: (blob: Blob) => void; onCancel: () => void }) {
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const cameraFeedRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const canvasTrackRef = useRef<MediaStreamTrack | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const drawingRef = useRef(false);
  const facingRef = useRef<'user' | 'environment'>('user');

  const [elapsedMs, setElapsedMs] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  function applyMirroring() {
    if (bgVideoRef.current) {
      bgVideoRef.current.style.transform = facingRef.current === 'user' ? 'scaleX(-1)' : 'none';
    }
  }

  function drawCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, dw: number, dh: number) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    const scale = Math.max(dw / vw, dh / vh);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
  }

  function startDrawLoop() {
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const feed = cameraFeedRef.current;
    if (!canvas || !feed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw() {
      if (!drawingRef.current || !ctx || !feed) return;
      if (feed.readyState >= 2) {
        ctx.save();
        if (facingRef.current === 'user') {
          ctx.translate(CANVAS_SIZE, 0);
          ctx.scale(-1, 1);
        }
        drawCover(ctx, feed, CANVAS_SIZE, CANVAS_SIZE);
        ctx.restore();
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  useEffect(() => {
    let cancelled = false;

    async function begin() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setError('Video messages need a browser/HTTPS context with camera support.');
        return;
      }
      let audioStream: MediaStream | null = null;
      let videoStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        });
      } catch (err) {
        audioStream?.getTracks().forEach((t) => t.stop());
        videoStream?.getTracks().forEach((t) => t.stop());
        setError('Camera/microphone access was denied.');
        return;
      }
      if (cancelled) {
        audioStream.getTracks().forEach((t) => t.stop());
        videoStream.getTracks().forEach((t) => t.stop());
        return;
      }

      audioTrackRef.current = audioStream.getAudioTracks()[0];
      cameraStreamRef.current = videoStream;
      if (cameraFeedRef.current) cameraFeedRef.current.srcObject = videoStream;
      if (bgVideoRef.current) bgVideoRef.current.srcObject = videoStream;
      applyMirroring();
      startDrawLoop();

      const canvas = canvasRef.current!;
      canvasTrackRef.current = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream })
        .captureStream(30)
        .getVideoTracks()[0];
      const recordStream = new MediaStream([canvasTrackRef.current, audioTrackRef.current]);

      chunksRef.current = [];
      const recorder = new MediaRecorder(recordStream);
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      recorderRef.current = recorder;

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 200);
    }

    begin();

    return () => {
      cancelled = true;
      drawingRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioTrackRef.current?.stop();
      canvasTrackRef.current?.stop();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  async function flipCamera() {
    if (!cameraStreamRef.current || flipping) return;
    setFlipping(true);
    const next = facingRef.current === 'user' ? 'environment' : 'user';

    // Release the current camera before requesting the other facing
    // mode — most phones only allow one open camera stream at a time.
    cameraStreamRef.current.getTracks().forEach((t) => t.stop());

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: next, width: { ideal: 480 }, height: { ideal: 480 } },
      });
      cameraStreamRef.current = newStream;
      facingRef.current = next;
    } catch (err) {
      try {
        cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: facingRef.current, width: { ideal: 480 }, height: { ideal: 480 } },
        });
      } catch {
        cameraStreamRef.current = null;
      }
    }

    if (cameraStreamRef.current) {
      if (cameraFeedRef.current) cameraFeedRef.current.srcObject = cameraStreamRef.current;
      if (bgVideoRef.current) bgVideoRef.current.srcObject = cameraStreamRef.current;
    }
    applyMirroring();
    setFlipping(false);
  }

  function finish(send: boolean) {
    const recorder = recorderRef.current;
    if (!recorder) {
      onCancel();
      return;
    }
    recorder.onstop = () => {
      const blob = send && chunksRef.current.length ? new Blob(chunksRef.current, { type: 'video/webm' }) : null;
      chunksRef.current = [];
      if (blob) onSend(blob);
      else onCancel();
    };
    if (recorder.state !== 'inactive') recorder.stop();
    else onCancel();
  }

  const seconds = Math.floor(elapsedMs / 1000);
  const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  if (error) {
    return (
      <div className="fixed inset-0 z-[1090] flex flex-col items-center justify-center gap-4 bg-black/90 text-white">
        <p className="max-w-xs text-center text-sm">{error}</p>
        <button onClick={onCancel} className="rounded-full bg-white/10 px-4 py-2 text-sm">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1090] flex flex-col items-center justify-center gap-5 bg-black/90 backdrop-blur-sm text-white">
      <div className="relative" style={{ width: 'min(70vw, 260px)', aspectRatio: '1 / 1' }}>
        <video
          ref={bgVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute rounded-full object-cover"
          style={{ inset: '-45%', width: '190%', height: '190%', filter: 'blur(35px) saturate(150%) brightness(0.7)', opacity: 0.85, zIndex: 0 }}
        />
        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute inset-0 h-full w-full rounded-full bg-slate-800" style={{ zIndex: 1 }} />
        <video ref={cameraFeedRef} autoPlay muted playsInline className="absolute h-px w-px opacity-0" />
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute" style={{ inset: '-6px', width: 'calc(100% + 12px)', height: 'calc(100% + 12px)', zIndex: 2 }}>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#dc3545" strokeWidth={3} opacity={0.9} />
        </svg>
        <button
          onClick={flipCamera}
          disabled={flipping}
          title="Switch camera"
          className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur disabled:opacity-50"
          style={{ bottom: '4%', right: '4%', zIndex: 3 }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="font-mono text-lg tabular-nums opacity-90">{timeLabel}</div>

      <div className="flex items-center gap-6">
        <button onClick={() => finish(false)} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
        <button onClick={() => finish(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
