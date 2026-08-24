'use client';

import { useCallback, useRef, useState } from 'react';

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    if (mediaRecorderRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new Error('Voice recording is not available in this browser/context (needs HTTPS).');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.start();
    mediaRecorderRef.current = recorder;
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 100);
    setRecording(true);
  }, []);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const finish = useCallback(
    (send: boolean): Promise<Blob | null> =>
      new Promise((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
          cleanup();
          resolve(null);
          return;
        }
        recorder.onstop = () => {
          const blob = send && chunksRef.current.length ? new Blob(chunksRef.current, { type: 'audio/webm' }) : null;
          chunksRef.current = [];
          cleanup();
          resolve(blob);
        };
        if (recorder.state !== 'inactive') recorder.stop();
        else {
          cleanup();
          resolve(null);
        }
      }),
    [cleanup]
  );

  return { recording, elapsedMs, start, finish };
}
