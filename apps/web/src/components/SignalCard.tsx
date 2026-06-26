'use client';

import { SEGMENT_LABELS, SUBCATEGORY_LABELS, SIGNAL_STATUS_LABELS, INTERVAL_LABELS } from '@/lib/labels';

interface SignalCardProps {
  signal: any;
  onAcknowledge?: (signalId: string) => void;
  showAcknowledge?: boolean;
}

export default function SignalCard({ signal, onAcknowledge, showAcknowledge }: SignalCardProps) {
  const isBuy = signal.action === 'BUY';
  const isActive = signal.status === 'ACTIVE';
  const isPremiumLocked = signal.requiresPremium;

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-800',
    HIT_TARGET: 'bg-green-100 text-green-800',
    HIT_SL: 'bg-red-100 text-red-800',
    SAFE_EXIT: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className={`card relative ${isActive ? 'border-l-4' : 'border-l-4 opacity-50 grayscale-[30%]'} ${isBuy ? 'border-l-signal-green' : 'border-l-signal-red'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isBuy ? 'bg-signal-green text-white' : 'bg-signal-red text-white'}`}>
            {signal.action}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {SEGMENT_LABELS[signal.segment] || signal.segment}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {SUBCATEGORY_LABELS[signal.subCategory] || signal.subCategory}
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[signal.status] || ''}`}>
          {SIGNAL_STATUS_LABELS[signal.status] || signal.status}
        </span>
      </div>

      <h3 className={`text-lg font-bold mb-3 ${isPremiumLocked ? 'blur-sm select-none' : ''}`}>
        {signal.instrument}
      </h3>

      <div className={`grid grid-cols-2 gap-3 text-sm ${isPremiumLocked ? 'blur-sm select-none' : ''}`}>
        <div>
          <span className="text-gray-500">Entry Range</span>
          <p className="font-semibold">
            {typeof signal.entryPriceRange?.min === 'number'
              ? `${signal.entryPriceRange.min} - ${signal.entryPriceRange.max}`
              : `${signal.entryPriceRange?.min} - ${signal.entryPriceRange?.max}`}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Target</span>
          <p className="font-semibold text-signal-green">{signal.targetPrice}</p>
        </div>
        <div>
          <span className="text-gray-500">Stop Loss</span>
          <p className="font-semibold text-signal-red">{signal.stopLoss}</p>
        </div>
        {signal.safeExit && (
          <div>
            <span className="text-gray-500">Safe Exit</span>
            <p className="font-semibold text-yellow-600">{signal.safeExit}</p>
          </div>
        )}
      </div>

      {signal.note && (
        <p className="text-sm text-gray-500 mt-3 italic">{signal.note}</p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">
            {new Date(signal.createdAt).toLocaleString()}
          </span>
          {signal.updatedAt && signal.updatedAt !== signal.createdAt && !isActive && (
            <span className="text-[10px] text-gray-400 mt-0.5">
              Updated: {new Date(signal.updatedAt).toLocaleString()}
            </span>
          )}
        </div>
        {signal.targetIntervals && (
          <div className="flex gap-1">
            {signal.targetIntervals.map((interval: string) => (
              <span key={interval} className="text-xs bg-brand-emerald/10 text-brand-emerald px-2 py-0.5 rounded">
                {INTERVAL_LABELS[interval] || interval}
              </span>
            ))}
          </div>
        )}
      </div>

      {isPremiumLocked && (
        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto text-brand-emerald mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="font-semibold text-text-heading">Premium Signal</p>
            <a href="/payment" className="text-sm text-brand-emerald hover:underline">Unlock Now</a>
          </div>
        </div>
      )}

      {showAcknowledge && isActive && onAcknowledge && (
        <button
          onClick={() => onAcknowledge(signal._id)}
          className="mt-3 w-full btn-primary text-sm py-2"
        >
          Acknowledge Signal
        </button>
      )}
    </div>
  );
}
