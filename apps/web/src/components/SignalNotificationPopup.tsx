'use client';

import { useEffect } from 'react';
import { SEGMENT_LABELS } from '@/lib/labels';

interface SignalNotificationPopupProps {
  signal: any;
  onAcknowledge: () => void;
}

export default function SignalNotificationPopup({ signal, onAcknowledge }: SignalNotificationPopupProps) {
  useEffect(() => {
    // Vibrate on mobile devices (works without user interaction on Android)
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }

    // Auto-dismiss after 60 seconds
    const timer = setTimeout(() => {
      onAcknowledge();
    }, 60000);

    return () => {
      clearTimeout(timer);
      // Stop vibration on cleanup
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, [onAcknowledge]);

  const isBuy = signal.action === 'BUY';
  const segment = SEGMENT_LABELS[signal.segment] || signal.segment;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-8 px-4">
      <div className="fixed inset-0 bg-black/40" onClick={onAcknowledge} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[slideDown_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-gray-700 animate-[ring_0.5s_ease-in-out_2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <span className="text-sm font-semibold text-gray-500">New Signal</span>
          </div>
          <button onClick={onAcknowledge} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Signal Info */}
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-bold text-white ${isBuy ? 'bg-green-500' : 'bg-red-500'}`}>
              {signal.action}
            </span>
            <div>
              <p className="font-bold text-lg text-gray-900">{signal.instrument}</p>
              <p className="text-sm text-gray-500">{segment}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center bg-gray-50 rounded-xl p-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Entry</p>
              <p className="font-bold text-gray-900">
                {signal.entryPriceRange?.min} - {signal.entryPriceRange?.max}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Target</p>
              <p className="font-bold text-green-600">{signal.targetPrice}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Stop Loss</p>
              <p className="font-bold text-red-600">{signal.stopLoss}</p>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={onAcknowledge}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all"
          >
            Acknowledge Signal
          </button>
        </div>
      </div>
    </div>
  );
}
