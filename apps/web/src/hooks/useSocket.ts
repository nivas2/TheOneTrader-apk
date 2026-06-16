'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import { SOCKET_EVENTS } from '@theonetrade/shared-types';

export function useSignalSocket(onNewSignal: (data: any) => void, onSignalUpdate: (data: any) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.SIGNAL_NEW, onNewSignal);
    socket.on(SOCKET_EVENTS.SIGNAL_UPDATE, onSignalUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.SIGNAL_NEW, onNewSignal);
      socket.off(SOCKET_EVENTS.SIGNAL_UPDATE, onSignalUpdate);
    };
  }, [socket, onNewSignal, onSignalUpdate]);

  const acknowledgeSignal = useCallback(
    (signalId: string) => {
      if (socket) {
        socket.emit(SOCKET_EVENTS.SIGNAL_ACKNOWLEDGE, { signalId });
      }
    },
    [socket]
  );

  return { acknowledgeSignal };
}

export function useAdminSocket(onPaymentPending: (data: any) => void, onTelemetry: (data: any) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.PAYMENT_PENDING, onPaymentPending);
    socket.on(SOCKET_EVENTS.TELEMETRY_UPDATE, onTelemetry);

    return () => {
      socket.off(SOCKET_EVENTS.PAYMENT_PENDING, onPaymentPending);
      socket.off(SOCKET_EVENTS.TELEMETRY_UPDATE, onTelemetry);
    };
  }, [socket, onPaymentPending, onTelemetry]);
}
