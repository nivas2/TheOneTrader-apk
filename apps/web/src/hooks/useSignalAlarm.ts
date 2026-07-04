'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { SOCKET_EVENTS } from '@theonetrade/shared-types';

// Generate a WAV beep as a blob URL (300ms tone + 200ms silence, loops for pulsing alarm)
function createAlarmBlobUrl(): string {
  const sr = 8000, toneDur = 0.3, silDur = 0.2, freq = 800, vol = 0.3;
  const total = Math.floor(sr * (toneDur + silDur));
  const tone = Math.floor(sr * toneDur);
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0,'RIFF'); v.setUint32(4, 36 + total * 2, true); w(8,'WAVE');
  w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true);
  w(36,'data'); v.setUint32(40, total * 2, true);
  for (let i = 0; i < total; i++) {
    let s = 0;
    if (i < tone) {
      const t = i / sr;
      const env = Math.min(1, t * 50, (toneDur - t) * 50);
      s = (Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1) * vol * env;
    }
    v.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export function useSignalAlarm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { socket } = useSocket();

  // Create audio element and unlock on user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const audio = new Audio(createAlarmBlobUrl());
      audio.loop = true;
      audio.volume = 1.0;
      audioRef.current = audio;
    } catch {}

    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      const audio = audioRef.current;
      if (!audio) return;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        unlocked = true;
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
      }).catch(() => {});
    };

    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);

    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startAlarm = useCallback((durationSeconds: number = 30) => {
    // Vibrate on mobile
    if ('vibrate' in navigator) {
      const pattern: number[] = [];
      for (let i = 0; i < durationSeconds * 2; i++) {
        pattern.push(300, 200);
      }
      navigator.vibrate(pattern);
    }

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }

    // Auto-stop after duration
    timerRef.current = setTimeout(() => {
      stopAlarm();
    }, durationSeconds * 1000);
  }, []);

  const stopAlarm = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Listen for silence alarm from other devices
  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.SIGNAL_SILENCE_ALARM, () => {
      stopAlarm();
    });

    return () => {
      socket.off(SOCKET_EVENTS.SIGNAL_SILENCE_ALARM);
      stopAlarm();
    };
  }, [socket, stopAlarm]);

  return { startAlarm, stopAlarm };
}
