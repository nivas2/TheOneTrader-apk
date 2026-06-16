'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useBrowserNotification() {
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    permissionRef.current = Notification.permission;
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
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // Two-tone chime: C5 then E5
      const freqs = [523.25, 659.25];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.4, now + i * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
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
