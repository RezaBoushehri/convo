'use client';

import { useRef, useState } from 'react';

export default function VideoNotePlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      document.querySelectorAll('video').forEach((v) => v !== el && v.pause());
      el.play().catch(() => {});
    }
  }

  return (
    <div className="relative h-44 w-44 cursor-pointer overflow-hidden rounded-full bg-slate-800" onClick={toggle}>
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}
