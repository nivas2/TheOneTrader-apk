'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { SEGMENT_LABELS, SUBCATEGORY_LABELS, SIGNAL_STATUS_LABELS, INTERVAL_LABELS } from '@/lib/labels';
import { useAuth } from '@/context/AuthContext';

export default function SignalHistoryAdminPage() {
  const { user } = useAuth();
  const isSubAdmin = user?.role === 'SUBADMIN';
  const isMainAdmin = user?.role === 'ADMIN';

  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sub-admin signals tab (for main admin)
  const [activeTab, setActiveTab] = useState<'my' | 'subadmin'>('my');
  const [subadminSignals, setSubadminSignals] = useState<any[]>([]);
  const [isLoadingSubadmin, setIsLoadingSubadmin] = useState(false);
  const [subadminPage, setSubadminPage] = useState(1);
  const [subadminTotalPages, setSubadminTotalPages] = useState(1);
  const [subadminTotal, setSubadminTotal] = useState(0);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Dynamic labels from config
  const [segmentLabelMap, setSegmentLabelMap] = useState<Record<string, string>>(SEGMENT_LABELS);
  const [categoryLabelMap, setCategoryLabelMap] = useState<Record<string, string>>(SUBCATEGORY_LABELS);

  useEffect(() => {
    api.get('/config').then((res) => {
      const data = res.data.data;
      if (data?.segments?.length) {
        setSegmentLabelMap(Object.fromEntries(data.segments.map((s: any) => [s.key, s.label])));
      }
      if (data?.categories?.length) {
        setCategoryLabelMap(Object.fromEntries(data.categories.map((c: any) => [c.key, c.label])));
      }
    }).catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSignals = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (debouncedSearch) params.set('search', debouncedSearch);

    api.get(`/signals?${params.toString()}`)
      .then((res) => {
        setSignals(res.data.data || []);
        const pagination = res.data.pagination;
        if (pagination) {
          setTotalPages(pagination.totalPages || 1);
          setTotal(pagination.total || 0);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [page, startDate, endDate, debouncedSearch]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Reset to page 1 on filter change
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
    setPage(1);
  };

  const updateStatus = async (signalId: string, status: string) => {
    try {
      await api.put(`/admin/signals/${signalId}`, { status });
      toast.success(`Signal marked as ${SIGNAL_STATUS_LABELS[status] || status}`);
      fetchSignals();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Update failed');
    }
  };

  const toggleShowcase = async (signalId: string, current: boolean) => {
    try {
      await api.patch(`/admin/signals/${signalId}/showcase`);
      toast.success(current ? 'Removed from landing page' : 'Added to landing page showcase');
      fetchSignals();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Toggle failed');
    }
  };

  const clearFilters = () => {
    setStartDate(today);
    setEndDate(today);
    setSearch('');
    setPage(1);
  };

  const fetchSubadminSignals = useCallback(() => {
    setIsLoadingSubadmin(true);
    const params = new URLSearchParams();
    params.set('page', String(subadminPage));
    params.set('limit', String(limit));
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    api.get(`/admin/signals/by-subadmins?${params.toString()}`)
      .then((res) => {
        setSubadminSignals(res.data.data || []);
        const pagination = res.data.pagination;
        if (pagination) {
          setSubadminTotalPages(pagination.totalPages || 1);
          setSubadminTotal(pagination.total || 0);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingSubadmin(false));
  }, [subadminPage, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'subadmin' && isMainAdmin) {
      fetchSubadminSignals();
    }
  }, [activeTab, isMainAdmin, fetchSubadminSignals]);

  const showAllDates = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div>
      {/* Sub-admin banner */}
      {isSubAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
          Showing only your signals
        </div>
      )}

      {/* Main admin tabs */}
      {isMainAdmin && (
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'my' ? 'bg-white text-text-heading shadow-sm' : 'text-text-body hover:text-text-heading'
            }`}
          >
            All Signals
          </button>
          <button
            onClick={() => setActiveTab('subadmin')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'subadmin' ? 'bg-white text-text-heading shadow-sm' : 'text-text-body hover:text-text-heading'
            }`}
          >
            Sub-Admin Signals
          </button>
        </div>
      )}

      {/* Filters Row */}
      <div className="card mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search instrument, segment, category..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={showAllDates}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              All Dates
            </button>
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Result count */}
        <div className="mt-2 text-xs text-gray-400">
          {total} signal{total !== 1 ? 's' : ''} found
          {startDate && endDate ? ` from ${startDate} to ${endDate}` : startDate ? ` from ${startDate}` : endDate ? ` until ${endDate}` : ''}
        </div>
      </div>

      {/* Main signals table (shown when not on subadmin tab) */}
      {(activeTab === 'my' || !isMainAdmin) && (<>
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
        {/* Mobile card layout */}
        <div className="md:hidden space-y-3">
          {signals.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No signals found.</div>
          ) : (
            signals.map((signal) => (
              <div key={signal._id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-semibold text-sm">{signal.instrument}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${signal.action === 'BUY' ? 'bg-signal-green text-white' : 'bg-signal-red text-white'}`}>
                      {signal.action}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    signal.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                    signal.status === 'HIT_TARGET' ? 'bg-green-100 text-green-800' :
                    signal.status === 'HIT_SL' ? 'bg-red-100 text-red-800' :
                    signal.status === 'SAFE_EXIT' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {SIGNAL_STATUS_LABELS[signal.status] || signal.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {segmentLabelMap[signal.segment] || signal.segment} &middot; {categoryLabelMap[signal.subCategory] || signal.subCategory}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-gray-400 block">Entry</span>
                    <span className="font-medium">{signal.entryPriceRange?.min}-{signal.entryPriceRange?.max}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Target</span>
                    <span className="font-medium text-signal-green">{signal.targetPrice}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">SL</span>
                    <span className="font-medium text-signal-red">{signal.stopLoss}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  {new Date(signal.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(signal.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {signal.status === 'ACTIVE' && (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => updateStatus(signal._id, 'HIT_TARGET')} className="text-xs bg-green-500 text-white px-3 min-h-[36px] rounded hover:bg-green-600">Target</button>
                    <button onClick={() => updateStatus(signal._id, 'HIT_SL')} className="text-xs bg-red-500 text-white px-3 min-h-[36px] rounded hover:bg-red-600">SL</button>
                    <button onClick={() => updateStatus(signal._id, 'SAFE_EXIT')} className="text-xs bg-yellow-500 text-white px-3 min-h-[36px] rounded hover:bg-yellow-600">Safe</button>
                    <button onClick={() => updateStatus(signal._id, 'CANCELLED')} className="text-xs bg-gray-500 text-white px-3 min-h-[36px] rounded hover:bg-gray-600">Cancel</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop table layout */}
        <div className="hidden md:block overflow-x-auto">
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
                <th className="py-3 px-2 font-medium text-gray-500">Showcase</th>
                <th className="py-3 px-2 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {signals.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-gray-400">No signals found.</td>
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
                    <td className="py-3 px-2">{segmentLabelMap[signal.segment] || signal.segment}</td>
                    <td className="py-3 px-2 text-gray-500">{categoryLabelMap[signal.subCategory] || signal.subCategory}</td>
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
                    <td className="py-3 px-2 text-gray-400 whitespace-nowrap">
                      {new Date(signal.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <br />
                      <span className="text-xs">{new Date(signal.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => toggleShowcase(signal._id, signal.showcaseOnLanding)}
                        title={signal.showcaseOnLanding ? 'Remove from landing page' : 'Show on landing page'}
                        className={`text-lg transition-colors ${signal.showcaseOnLanding ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-300 hover:text-yellow-400'}`}
                      >
                        {signal.showcaseOnLanding ? '\u2605' : '\u2606'}
                      </button>
                    </td>
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
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      )}
      </>)}

      {/* Sub-Admin Signals Tab (main admin only) */}
      {activeTab === 'subadmin' && isMainAdmin && (
        <>
          {isLoadingSubadmin ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-3 px-2 font-medium text-gray-500">Created By</th>
                    <th className="py-3 px-2 font-medium text-gray-500">Instrument</th>
                    <th className="py-3 px-2 font-medium text-gray-500">Action</th>
                    <th className="py-3 px-2 font-medium text-gray-500">Segment</th>
                    <th className="py-3 px-2 font-medium text-gray-500">Entry</th>
                    <th className="py-3 px-2 font-medium text-gray-500">Target</th>
                    <th className="py-3 px-2 font-medium text-gray-500">SL</th>
                    <th className="py-3 px-2 font-medium text-gray-500">Status</th>
                    <th className="py-3 px-2 font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {subadminSignals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-400">No sub-admin signals found.</td>
                    </tr>
                  ) : (
                    subadminSignals.map((signal) => (
                      <tr key={signal._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium text-blue-600">{signal.createdBy?.name || 'Unknown'}</td>
                        <td className="py-3 px-2 font-medium">{signal.instrument}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${signal.action === 'BUY' ? 'bg-signal-green text-white' : 'bg-signal-red text-white'}`}>
                            {signal.action}
                          </span>
                        </td>
                        <td className="py-3 px-2">{segmentLabelMap[signal.segment] || signal.segment}</td>
                        <td className="py-3 px-2">{signal.entryPriceRange?.min}-{signal.entryPriceRange?.max}</td>
                        <td className="py-3 px-2 text-signal-green">{signal.targetPrice}</td>
                        <td className="py-3 px-2 text-signal-red">{signal.stopLoss}</td>
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
                        <td className="py-3 px-2 text-gray-400 whitespace-nowrap">
                          {new Date(signal.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-admin Pagination */}
          {subadminTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {subadminPage} of {subadminTotalPages} ({subadminTotal} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSubadminPage((p) => Math.max(1, p - 1))}
                  disabled={subadminPage === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setSubadminPage((p) => Math.min(subadminTotalPages, p + 1))}
                  disabled={subadminPage >= subadminTotalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
