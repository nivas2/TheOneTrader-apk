'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { SEGMENT_LABELS, SUBCATEGORY_LABELS, SIGNAL_STATUS_LABELS, INTERVAL_LABELS } from '@/lib/labels';

export default function SignalHistoryAdminPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSignals = () => {
    setIsLoading(true);
    api.get('/signals?limit=50')
      .then((res) => setSignals(res.data.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const updateStatus = async (signalId: string, status: string) => {
    try {
      await api.put(`/admin/signals/${signalId}`, { status });
      toast.success(`Signal marked as ${SIGNAL_STATUS_LABELS[status] || status}`);
      fetchSignals();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Update failed');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-3 px-2 font-medium text-gray-500">Instrument</th>
              <th className="py-3 px-2 font-medium text-gray-500">Action</th>
              <th className="py-3 px-2 font-medium text-gray-500">Segment</th>
              <th className="py-3 px-2 font-medium text-gray-500">Category</th>
              <th className="py-3 px-2 font-medium text-gray-500">Intervals</th>
              <th className="py-3 px-2 font-medium text-gray-500">Entry</th>
              <th className="py-3 px-2 font-medium text-gray-500">Target</th>
              <th className="py-3 px-2 font-medium text-gray-500">SL</th>
              <th className="py-3 px-2 font-medium text-gray-500">Safe Exit</th>
              <th className="py-3 px-2 font-medium text-gray-500">Status</th>
              <th className="py-3 px-2 font-medium text-gray-500">Date</th>
              <th className="py-3 px-2 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {signals.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-8 text-gray-400">No signals found.</td>
              </tr>
            ) : (
              signals.map((signal) => (
                <tr key={signal._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{signal.instrument}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${signal.action === 'BUY' ? 'bg-signal-green text-white' : 'bg-signal-red text-white'}`}>
                      {signal.action}
                    </span>
                  </td>
                  <td className="py-3 px-2">{SEGMENT_LABELS[signal.segment] || signal.segment}</td>
                  <td className="py-3 px-2 text-gray-500">{SUBCATEGORY_LABELS[signal.subCategory] || signal.subCategory}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1 flex-wrap">
                      {signal.targetIntervals?.map((i: string) => (
                        <span key={i} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{INTERVAL_LABELS[i] || i}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-2">{signal.entryPriceRange?.min}-{signal.entryPriceRange?.max}</td>
                  <td className="py-3 px-2 text-signal-green">{signal.targetPrice}</td>
                  <td className="py-3 px-2 text-signal-red">{signal.stopLoss}</td>
                  <td className="py-3 px-2 text-yellow-600">{signal.safeExit || '-'}</td>
                  <td className="py-3 px-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      signal.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                      signal.status === 'HIT_TARGET' ? 'bg-green-100 text-green-800' :
                      signal.status === 'HIT_SL' ? 'bg-red-100 text-red-800' :
                      signal.status === 'SAFE_EXIT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {SIGNAL_STATUS_LABELS[signal.status] || signal.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-400">{new Date(signal.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-2">
                    {signal.status === 'ACTIVE' && (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => updateStatus(signal._id, 'HIT_TARGET')} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Target</button>
                        <button onClick={() => updateStatus(signal._id, 'HIT_SL')} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">SL</button>
                        <button onClick={() => updateStatus(signal._id, 'SAFE_EXIT')} className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">Safe</button>
                        <button onClick={() => updateStatus(signal._id, 'CANCELLED')} className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600">Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
