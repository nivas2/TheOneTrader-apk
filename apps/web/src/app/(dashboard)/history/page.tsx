'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import SignalCard from '@/components/SignalCard';

export default function HistoryPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchHistory = (pageNum: number) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: pageNum.toString(), limit: '12' });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    api.get(`/signals/history?${params}`)
      .then((res) => {
        setSignals(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const handleFilter = () => {
    setPage(1);
    fetchHistory(1);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-4 items-end mb-6">
        <div>
          <label className="block text-sm text-gray-500 mb-1">From</label>
          <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">To</label>
          <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={handleFilter} className="btn-primary py-3">Filter</button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading history...</div>
      ) : signals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-body">No completed signals found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.map((signal) => (
              <SignalCard key={signal._id} signal={signal} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-2 px-4 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="py-2 px-4 text-sm text-text-body">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-2 px-4 text-sm disabled:opacity-50"
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
