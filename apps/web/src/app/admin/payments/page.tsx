'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PLAN_TYPE_LABELS, SEGMENT_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/labels';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';

const STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  PENDING_ACTIVATION: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  REJECTED: 'bg-red-100 text-red-800',
};

type Tab = 'ALL' | 'PENDING_APPROVAL' | 'REJECTED';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function AdminPaymentsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const fetchSubscriptions = (tab: Tab) => {
    setIsLoading(true);
    const endpoint = tab === 'PENDING_APPROVAL'
      ? '/admin/subscriptions/pending'
      : `/admin/subscriptions/all${tab !== 'ALL' ? `?status=${tab}` : ''}`;
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

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this payment?')) return;
    try {
      await api.put(`/admin/subscriptions/${id}/reject`);
      toast.success('Subscription rejected');
      fetchSubscriptions(activeTab);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Rejection failed');
    }
  };

  const getReceiptUrl = (filePath: string) => {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    const filename = filePath.replace(/\\/g, '/').split('/').pop();
    return `${API_BASE}/uploads/${filename}`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  const downloadCSV = () => {
    if (subscriptions.length === 0) return;
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Plan', 'Segment', 'Amount', 'UTR / Ref ID', 'Status'];
    const rows = subscriptions.map((sub) => {
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Payments</h2>
        <div className="flex gap-2">
          <button onClick={downloadCSV} disabled={subscriptions.length === 0} className="btn-secondary text-sm py-2 px-4 disabled:opacity-40">
            Export CSV
          </button>
          <button onClick={() => fetchSubscriptions(activeTab)} className="btn-secondary text-sm py-2 px-4">
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-emerald text-brand-emerald'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : subscriptions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-body">No {activeTab === 'ALL' ? '' : activeTab === 'PENDING_APPROVAL' ? 'pending ' : 'rejected '}payments found.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 bg-gray-50/50">
                <th className="px-3 py-3 font-medium">User</th>
                <th className="px-3 py-3 font-medium">Phone</th>
                <th className="px-3 py-3 font-medium">Plan</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">UTR / Ref ID</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Receipt</th>
                {showActions && <th className="px-3 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
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
              })}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
