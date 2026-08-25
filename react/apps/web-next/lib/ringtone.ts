'use client';

// Synthesized ring/dial tones via Web Audio — no audio asset needed.

let audioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;

function ensureAudioCtx(): AudioContext | null {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep(freq: number, duration: number, delay: number) {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.15, t0 + 0.03);
    gain.gain.linearRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  } catch {
    // audio isn't critical to call function
  }
}

export function startRingtone(kind: 'incoming' | 'outgoing') {
  stopRingtone();
  const play = () => {
    if (kind === 'incoming') {
      beep(660, 0.22, 0);
      beep(880, 0.22, 0.28);
    } else {
      beep(440, 0.4, 0);
    }
  };
  play();
  ringInterval = setInterval(play, 1600);
}

export function stopRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
}
