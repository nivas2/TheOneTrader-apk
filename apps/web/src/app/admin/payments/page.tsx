'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PLAN_TYPE_LABELS, SEGMENT_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/labels';

const API_BASE = (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL || '').origin; } catch { return ''; } })();

const STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  PENDING_ACTIVATION: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  REJECTED: 'bg-red-100 text-red-800',
};

type Tab = 'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

type SortDir = 'asc' | 'desc' | null;
type SortKey = 'user' | 'phone' | 'plan' | 'amount' | 'utrId' | 'date' | 'status';

export default function AdminPaymentsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterAmount, setFilterAmount] = useState('');
  const [filterUtr, setFilterUtr] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const fetchSubscriptions = (tab: Tab) => {
    setIsLoading(true);
    const endpoint = tab === 'PENDING_APPROVAL'
      ? '/admin/subscriptions/pending'
      : `/admin/subscriptions/all${tab !== 'ALL' ? `?status=${tab === 'APPROVED' ? 'PENDING_ACTIVATION,ACTIVE,EXPIRED' : tab}` : ''}`;
    api.get(endpoint)
      .then((res) => setSubscriptions(res.data.data || []))
      .catch(() => toast.error('Failed to load subscriptions'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchSubscriptions(activeTab);
  }, [activeTab]);

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/admin/subscriptions/${id}/approve`);
      toast.success('Subscription approved - activates tomorrow');
      fetchSubscriptions(activeTab);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Approval failed');
    }
  };

  const handleReject = (id: string) => {
    setRejectModal({ id, reason: '' });
  };

  const confirmReject = async () => {
    if (!rejectModal || !rejectModal.reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.put(`/admin/subscriptions/${rejectModal.id}/reject`, { reason: rejectModal.reason.trim() });
      toast.success('Subscription rejected');
      setRejectModal(null);
      fetchSubscriptions(activeTab);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Rejection failed');
    }
  };

  const getReceiptUrl = (filePath: string) => {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    const filename = filePath.replace(/\\/g, '/').split('/').pop();
    return `${API_BASE}/uploads/receipts/${filename}`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  // Helper to get sortable values
  const getSortValue = (sub: any, key: SortKey): string | number => {
    const user = sub.userId as any;
    switch (key) {
      case 'user': return (user?.name || '').toLowerCase();
      case 'phone': return user?.phone || '';
      case 'plan': return PLAN_TYPE_LABELS[sub.planType] || sub.planType || '';
      case 'amount': return sub.amount || 0;
      case 'utrId': return sub.utrId || '';
      case 'date': return new Date(sub.createdAt).getTime();
      case 'status': return SUBSCRIPTION_STATUS_LABELS[sub.status] || sub.status || '';
      default: return '';
    }
  };

  // Filter + sort logic
  const filteredSubscriptions = useMemo(() => {
    let data = [...subscriptions];

    // Global search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      data = data.filter((sub) => {
        const user = sub.userId as any;
        return (
          (user?.name || '').toLowerCase().includes(q) ||
          (user?.email || '').toLowerCase().includes(q) ||
          (user?.phone || '').includes(q) ||
          (PLAN_TYPE_LABELS[sub.planType] || sub.planType || '').toLowerCase().includes(q) ||
          (SEGMENT_LABELS[sub.segment] || sub.segment || '').toLowerCase().includes(q) ||
          (sub.utrId || '').toLowerCase().includes(q) ||
          (SUBSCRIPTION_STATUS_LABELS[sub.status] || sub.status || '').toLowerCase().includes(q) ||
          String(sub.amount || '').includes(q)
        );
      });
    }

    // Column filters
    if (filterUser.trim()) {
      const q = filterUser.toLowerCase();
      data = data.filter((sub) => {
        const user = sub.userId as any;
        return (user?.name || '').toLowerCase().includes(q) || (user?.email || '').toLowerCase().includes(q);
      });
    }
    if (filterPhone.trim()) {
      data = data.filter((sub) => ((sub.userId as any)?.phone || '').includes(filterPhone.trim()));
    }
    if (filterPlan.trim()) {
      const q = filterPlan.toLowerCase();
      data = data.filter((sub) =>
        (PLAN_TYPE_LABELS[sub.planType] || sub.planType || '').toLowerCase().includes(q) ||
        (SEGMENT_LABELS[sub.segment] || sub.segment || '').toLowerCase().includes(q)
      );
    }
    if (filterAmount.trim()) {
      data = data.filter((sub) => String(sub.amount || 0).includes(filterAmount.trim()));
    }
    if (filterUtr.trim()) {
      data = data.filter((sub) => (sub.utrId || '').toLowerCase().includes(filterUtr.toLowerCase()));
    }
    if (filterStatus.trim()) {
      const q = filterStatus.toLowerCase();
      data = data.filter((sub) => (SUBSCRIPTION_STATUS_LABELS[sub.status] || sub.status || '').toLowerCase().includes(q));
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      data = data.filter((sub) => new Date(sub.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      data = data.filter((sub) => new Date(sub.createdAt) <= to);
    }

    // Sort
    if (sortKey && sortDir) {
      data.sort((a, b) => {
        const va = getSortValue(a, sortKey);
        const vb = getSortValue(b, sortKey);
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va;
        }
        const sa = String(va);
        const sb = String(vb);
        return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });
    }

    return data;
  }, [subscriptions, searchText, filterUser, filterPhone, filterPlan, filterAmount, filterUtr, filterStatus, dateFrom, dateTo, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    const active = sortKey === colKey;
    return (
      <span className="inline-flex flex-col ml-1 -space-y-1 align-middle">
        <svg className={`w-3 h-3 ${active && sortDir === 'asc' ? 'text-brand-emerald' : 'text-gray-300'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 0l5 6H0z" /></svg>
        <svg className={`w-3 h-3 ${active && sortDir === 'desc' ? 'text-brand-emerald' : 'text-gray-300'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 6L0 0h10z" /></svg>
      </span>
    );
  };

  const clearAllFilters = () => {
    setSearchText('');
    setFilterUser('');
    setFilterPhone('');
    setFilterPlan('');
    setFilterAmount('');
    setFilterUtr('');
    setFilterStatus('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchText || filterUser || filterPhone || filterPlan || filterAmount || filterUtr || filterStatus || dateFrom || dateTo;

  const downloadCSV = () => {
    const data = filteredSubscriptions;
    if (data.length === 0) return;
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Plan', 'Segment', 'Amount', 'UTR / Ref ID', 'Status'];
    const rows = data.map((sub) => {
      const user = sub.userId as any;
      return [
        formatDate(sub.createdAt),
        user?.name || '',
        user?.email || '',
        user?.phone || '',
        PLAN_TYPE_LABELS[sub.planType] || sub.planType,
        SEGMENT_LABELS[sub.segment] || sub.segment,
        sub.amount > 0 ? sub.amount : '',
        sub.utrId || '',
        SUBSCRIPTION_STATUS_LABELS[sub.status] || sub.status,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${activeTab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showActions = activeTab === 'ALL' || activeTab === 'PENDING_APPROVAL';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">Payments</h2>
        <div className="flex gap-2">
          <button onClick={downloadCSV} disabled={filteredSubscriptions.length === 0} className="btn-secondary text-sm py-2 px-3 sm:px-4 disabled:opacity-40">
            CSV
          </button>
          <button onClick={() => fetchSubscriptions(activeTab)} className="btn-secondary text-sm py-2 px-3 sm:px-4">
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-brand-emerald text-brand-emerald'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Filter Bar */}
      <div className="space-y-3 mb-4">
        {/* Global search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name, email, phone, plan, UTR..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
          />
        </div>
        {/* Date range + filter buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 min-w-[130px] sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
            title="From date"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 min-w-[130px] sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
            title="To date"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors hidden md:inline-flex ${
              showFilters ? 'border-brand-emerald text-brand-emerald bg-brand-emerald/5' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="px-3 py-2 text-sm text-red-500 hover:text-red-700 font-medium whitespace-nowrap">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="text-xs text-gray-400 mb-2">
          Showing {filteredSubscriptions.length} of {subscriptions.length} records
          {hasActiveFilters && ' (filtered)'}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : subscriptions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-body">No {activeTab === 'ALL' ? '' : activeTab === 'PENDING_APPROVAL' ? 'pending ' : activeTab === 'APPROVED' ? 'approved ' : 'rejected '}payments found.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {filteredSubscriptions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No records match your filters.</div>
            ) : (
              filteredSubscriptions.map((sub) => {
                const user = sub.userId as any;
                const receiptUrl = getReceiptUrl(sub.receiptScreenshotPath);
                const isPending = sub.status === 'PENDING_APPROVAL';
                return (
                  <div key={sub._id} className="card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-heading">{user?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                        {SUBSCRIPTION_STATUS_LABELS[sub.status] || sub.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      <div>
                        <span className="text-xs text-gray-400 block">Phone</span>
                        <a href={`tel:${user?.phone}`} className="text-brand-emerald">{user?.phone}</a>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Amount</span>
                        <span className="font-semibold text-brand-emerald">{sub.amount > 0 ? `INR ${sub.amount.toLocaleString()}` : '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Plan</span>
                        <span className="font-medium">{PLAN_TYPE_LABELS[sub.planType] || sub.planType}</span>
                        <span className="text-xs text-gray-400 ml-1">{SEGMENT_LABELS[sub.segment] || sub.segment}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Date</span>
                        <span className="text-xs">{formatDate(sub.createdAt)}</span>
                      </div>
                    </div>
                    {sub.utrId && (
                      <p className="text-xs text-gray-500 mb-2">
                        <span className="text-gray-400">UTR:</span> <span className="font-mono">{sub.utrId}</span>
                      </p>
                    )}
                    {sub.status === 'REJECTED' && sub.rejectionReason && (
                      <p className="text-xs text-red-500 mb-2">{sub.rejectionReason}</p>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      {receiptUrl && (
                        <button onClick={() => setSelectedScreenshot(receiptUrl)} className="text-brand-emerald text-xs font-medium hover:underline">
                          View Receipt
                        </button>
                      )}
                      {showActions && isPending && (
                        <div className="flex gap-2 ml-auto">
                          <button onClick={() => handleApprove(sub._id)} className="bg-signal-green text-white px-3 py-1.5 rounded text-xs font-semibold min-h-[36px]">
                            Approve
                          </button>
                          <button onClick={() => handleReject(sub._id)} className="bg-signal-red text-white px-3 py-1.5 rounded text-xs font-semibold min-h-[36px]">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="card overflow-x-auto p-0 hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 bg-gray-50/50">
                  <th className="px-3 py-3 font-medium cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('user')}>
                    User <SortIcon colKey="user" />
                  </th>
                  <th className="px-3 py-3 font-medium cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('phone')}>
                    Phone <SortIcon colKey="phone" />
                  </th>
                  <th className="px-3 py-3 font-medium cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('plan')}>
                    Plan <SortIcon colKey="plan" />
                  </th>
                  <th className="px-3 py-3 font-medium cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('amount')}>
                    Amount <SortIcon colKey="amount" />
                  </th>
                  <th className="px-3 py-3 font-medium cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('utrId')}>
                    UTR / Ref ID <SortIcon colKey="utrId" />
                  </th>
                  <th className="px-3 py-3 font-medium cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('date')}>
                    Date <SortIcon colKey="date" />
                  </th>
                  <th className="px-3 py-3 font-medium cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('status')}>
                    Status <SortIcon colKey="status" />
                  </th>
                  <th className="px-3 py-3 font-medium">Receipt</th>
                  {showActions && <th className="px-3 py-3 font-medium text-right">Actions</th>}
                </tr>
                {showFilters && (
                  <tr className="border-b border-gray-200 bg-gray-50/30">
                    <th className="px-2 py-2">
                      <input type="text" placeholder="Name / email" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-emerald/30 focus:border-brand-emerald" />
                    </th>
                    <th className="px-2 py-2">
                      <input type="text" placeholder="Phone" value={filterPhone} onChange={(e) => setFilterPhone(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-emerald/30 focus:border-brand-emerald" />
                    </th>
                    <th className="px-2 py-2">
                      <input type="text" placeholder="Plan / segment" value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-emerald/30 focus:border-brand-emerald" />
                    </th>
                    <th className="px-2 py-2">
                      <input type="text" placeholder="Amount" value={filterAmount} onChange={(e) => setFilterAmount(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-emerald/30 focus:border-brand-emerald" />
                    </th>
                    <th className="px-2 py-2">
                      <input type="text" placeholder="UTR / Ref ID" value={filterUtr} onChange={(e) => setFilterUtr(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-emerald/30 focus:border-brand-emerald" />
                    </th>
                    <th className="px-2 py-2">
                      <span className="text-xs text-gray-400">Use date range above</span>
                    </th>
                    <th className="px-2 py-2">
                      <input type="text" placeholder="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-emerald/30 focus:border-brand-emerald" />
                    </th>
                    <th className="px-2 py-2" />
                    {showActions && <th className="px-2 py-2" />}
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={showActions ? 9 : 8} className="text-center py-8 text-gray-400">
                      No records match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => {
                    const user = sub.userId as any;
                    const receiptUrl = getReceiptUrl(sub.receiptScreenshotPath);
                    const isPending = sub.status === 'PENDING_APPROVAL';
                    return (
                      <tr key={sub._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-3 py-3">
                          <p className="font-medium">{user?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{user?.email}</p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">{user?.phone}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{PLAN_TYPE_LABELS[sub.planType] || sub.planType}</p>
                          <p className="text-xs text-gray-400">{SEGMENT_LABELS[sub.segment] || sub.segment}</p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-semibold text-brand-emerald">
                          {sub.amount > 0 ? `INR ${sub.amount.toLocaleString()}` : <span className="text-gray-400 font-normal text-xs">-</span>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">
                          {sub.utrId || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">{formatDate(sub.createdAt)}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                            {SUBSCRIPTION_STATUS_LABELS[sub.status] || sub.status}
                          </span>
                          {sub.status === 'REJECTED' && sub.rejectionReason && (
                            <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={sub.rejectionReason}>
                              {sub.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {receiptUrl ? (
                            <button
                              onClick={() => setSelectedScreenshot(receiptUrl)}
                              className="text-brand-emerald hover:underline text-xs font-medium"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        {showActions && (
                          <td className="px-3 py-3 whitespace-nowrap text-right">
                            {isPending ? (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleApprove(sub._id)}
                                  className="bg-signal-green text-white px-3 py-1.5 rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(sub._id)}
                                  className="bg-signal-red text-white px-3 py-1.5 rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Receipt Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="bg-white rounded-xl p-4 max-w-3xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Payment Receipt</h3>
              <button onClick={() => setSelectedScreenshot(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <img
              src={selectedScreenshot}
              alt="Payment Receipt"
              className="max-w-full rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.insertAdjacentHTML(
                  'beforeend',
                  '<p class="text-center py-8 text-gray-400 text-sm">Failed to load image</p>'
                );
              }}
            />
            <button onClick={() => setSelectedScreenshot(null)} className="btn-secondary w-full mt-4">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-1">Reject Payment</h3>
            <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejecting this payment. The user will see this reason.</p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="e.g., Screenshot is unclear, amount mismatch, duplicate submission..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              rows={3}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 btn-secondary py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectModal.reason.trim()}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
