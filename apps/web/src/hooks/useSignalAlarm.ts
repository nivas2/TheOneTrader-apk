'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { SOCKET_EVENTS } from '@theonetrade/shared-types';

export function useSignalAlarm() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioReadyRef = useRef(false);
  const { socket } = useSocket();

  // Pre-warm AudioContext on ANY user interaction (not just first)
  useEffect(() => {
    const initAudio = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            audioReadyRef.current = true;
          });
        } else {
          audioReadyRef.current = true;
        }
      } catch {}
    };

    // Listen for multiple interactions (not once) to ensure AudioContext stays alive
    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);
    document.addEventListener('keydown', initAudio);

    // Also try to initialize immediately (will work if user already interacted)
    initAudio();

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  const startAlarm = useCallback(async (durationSeconds: number = 30) => {
    // Vibrate on mobile (works without user interaction on Android)
    if ('vibrate' in navigator) {
      // Repeated vibration pattern for the alarm duration
      const pattern: number[] = [];
      for (let i = 0; i < durationSeconds * 2; i++) {
        pattern.push(300, 200);
      }
      navigator.vibrate(pattern);
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;

      // Await resume so oscillator can actually produce sound
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // If context is still not running, audio won't work — vibration is the fallback
      if (ctx.state !== 'running') return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

      // Create pulsing alarm effect
      const pulseInterval = setInterval(() => {
        if (oscillator && gainNode) {
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        }
      }, 500);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();

      oscillatorRef.current = oscillator;

      // Auto-stop after duration
      timerRef.current = setTimeout(() => {
        stopAlarm();
        clearInterval(pulseInterval);
      }, durationSeconds * 1000);

      // Store pulse interval for cleanup
      (oscillatorRef.current as any)._pulseInterval = pulseInterval;
    } catch (error) {
      console.error('Failed to start alarm:', error);
    }
  }, []);

  const stopAlarm = useCallback(() => {
    // Stop vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }

    if (oscillatorRef.current) {
      try {
        const pulseInterval = (oscillatorRef.current as any)._pulseInterval;
        if (pulseInterval) clearInterval(pulseInterval);
        oscillatorRef.current.stop();
      } catch {
        // Already stopped
      }
      oscillatorRef.current = null;
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
