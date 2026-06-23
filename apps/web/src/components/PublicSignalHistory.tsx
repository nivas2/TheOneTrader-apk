'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { SEGMENT_LABELS } from '@/lib/labels';

interface PublicSignalHistoryProps {
  segment: string;
  visible: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  HIT_TARGET: 'bg-green-100 text-green-700',
  HIT_SL: 'bg-red-100 text-red-700',
  SAFE_EXIT: 'bg-blue-100 text-blue-700',
};

const STATUS_LABELS: Record<string, string> = {
  HIT_TARGET: 'Target Hit',
  HIT_SL: 'SL Hit',
  SAFE_EXIT: 'Safe Exit',
};

// Map landing page segment IDs to backend segment keys
const SEGMENT_KEY_MAP: Record<string, string> = {
  intraday: 'INTRADAY',
  fno: 'FANDO',
  mtf: 'MTF',
  longterm: 'LONGTERM',
  shortterm: 'SHORTTERM',
};

export default function PublicSignalHistory({ segment, visible }: PublicSignalHistoryProps) {
  const [signals, setSignals] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const segmentKey = SEGMENT_KEY_MAP[segment] || segment;

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api.get(`/public/signals/history/public?segment=${segmentKey}&page=${page}&limit=10`)
      .then((res) => {
        setSignals(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
      })
      .catch(() => setSignals([]))
      .finally(() => setLoading(false));
  }, [visible, segmentKey, page]);

  // Reset page when segment changes
  useEffect(() => {
    setPage(1);
  }, [segment]);

  if (!visible) return null;

  return (
    <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          Past Signals - {SEGMENT_LABELS[segmentKey] || segment}
        </h4>
        <span className="text-xs text-gray-400">{signals.length > 0 ? `Page ${page} of ${totalPages}` : ''}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-emerald" />
        </div>
      ) : signals.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">No signal history available for this segment</p>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {signals.map((signal) => (
              <div key={signal._id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${signal.action === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {signal.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-heading truncate">{signal.instrument}</p>
                  <p className="text-xs text-gray-400">
                    Entry: {signal.entryPriceRange?.min} - {signal.entryPriceRange?.max} | Target: {signal.targetPrice} | SL: {signal.stopLoss}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${STATUS_STYLES[signal.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[signal.status] || signal.status}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">
                  {new Date(signal.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
