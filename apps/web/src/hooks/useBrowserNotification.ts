'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useBrowserNotification() {
  const permissionRef = useRef<NotificationPermission>('default');
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Create persistent AudioContext and unlock on user gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }

    try {
      audioCtxRef.current = new AudioContext();
    } catch {}

    const unlock = () => {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state !== 'suspended') {
        if (ctx && ctx.state === 'running') removeListeners();
        return;
      }
      ctx.resume().then(() => {
        removeListeners();
      }).catch(() => {});
    };

    const removeListeners = () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };

    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);

    // Try immediate resume — user activation from login may still be valid
    unlock();

    return () => {
      removeListeners();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === 'granted';
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
      }
      // Try to resume if suspended (best-effort)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      // Two-tone chime: C5 then E5
      const freqs = [523.25, 659.25];
      freqs.forEach((freq, i) => {
        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.4, now + i * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
        osc.connect(gain);
        gain.connect(ctx!.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.5);
      });
    } catch {
      // Audio not available
    }
  }, []);

  const showNotification = useCallback(
    (title: string, body: string, onClick?: () => void) => {
      playNotificationSound();

      if (
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        permissionRef.current !== 'granted'
      ) {
        return;
      }

      // Only show OS notification when tab is not focused
      if (document.hidden) {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'theonetrade-signal',
        });
        if (onClick) {
          notification.onclick = () => {
            window.focus();
            onClick();
          };
        }
      }
    },
    [playNotificationSound]
  );

  return { requestPermission, showNotification };
}
