'use client';

import { useEffect, useRef, useState } from 'react';

function formatTime(t: number) {
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer({ src, tone = 'light' }: { src: string; tone?: 'light' | 'dark' }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    // Recordings from MediaRecorder often report duration=Infinity until
    // a seek forces the browser to compute it.
    async function resolveDuration() {
      if (!el) return;
      if (isFinite(el.duration)) {
        setDuration(el.duration);
        return;
      }
      const onTimeUpdate = () => {
        el.removeEventListener('timeupdate', onTimeUpdate);
        el.currentTime = 0;
        if (isFinite(el.duration)) setDuration(el.duration);
      };
      el.addEventListener('timeupdate', onTimeUpdate);
      el.currentTime = 1e101;
    }

    const onLoaded = () => resolveDuration();
    const onTime = () => setCurrent(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };

    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else {
      document.querySelectorAll('audio').forEach((a) => a !== el && a.pause());
      el.play().catch(() => {});
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
  }

  const progress = duration ? (current / duration) * 100 : 0;
  const dark = tone === 'dark';

  return (
    <div className="flex w-56 items-center gap-2">
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" className="hidden" />
      <button
        onClick={toggle}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-white/20 text-white' : 'bg-brand text-white'}`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1">
        <div onClick={seek} className={`h-1.5 cursor-pointer rounded-full ${dark ? 'bg-white/25' : 'bg-slate-200'}`}>
          <div className={`h-full rounded-full ${dark ? 'bg-white' : 'bg-brand'}`} style={{ width: `${progress}%` }} />
        </div>
        <span className={`mt-1 block text-[11px] tabular-nums ${dark ? 'text-white/70' : 'text-slate-400'}`}>
          {formatTime(playing || current ? current : duration)}
        </span>
      </div>
    </div>
  );
}
