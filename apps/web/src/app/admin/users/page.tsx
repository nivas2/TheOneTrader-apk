'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { SEGMENT_LABELS, PLAN_TYPE_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/labels';

interface UserWithSub {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  activeSubscription: {
    planType: string;
    segment: string;
    activatedAt: string;
    expiresAt: string;
    status: string;
  } | null;
  latestSubscription: {
    planType: string;
    segment: string;
    status: string;
    createdAt: string;
  } | null;
  totalSubscriptions: number;
}

export default function AdminUsersPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [users, setUsers] = useState<UserWithSub[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0, limit: 20 });
  const [userStats, setUserStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await api.get(`/admin/analytics/users/list?${params}`);
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [filter, search, startDate, endDate]);

  useEffect(() => {
    fetchUsers(1);
  }, [filter, fetchUsers]);

  useEffect(() => {
    api.get('/admin/analytics/users')
      .then((res) => setUserStats(res.data.data))
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/admin/export/csv?filter=${filter}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-${filter}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/analytics/users/${userId}/toggle-active`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isActive: !currentStatus } : u))
      );
      toast.success(currentStatus ? 'User deactivated' : 'User activated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle user status');
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const daysLeft = (expiresAt: string) => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div>
      {/* Stats Cards */}
      {userStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-2xl font-bold">{userStats.totalUsers}</p>
            <p className="text-xs text-gray-500">Total Users</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-brand-emerald">{userStats.verifiedUsers}</p>
            <p className="text-xs text-gray-500">Verified</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{userStats.activeSubscriptions}</p>
            <p className="text-xs text-gray-500">Active Subscriptions</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-yellow-600">{userStats.pendingPayments}</p>
            <p className="text-xs text-gray-500">Pending Payments</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Tab Filters */}
          <div className="flex gap-2">
            {['all', 'subscribed', 'unsubscribed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-brand-emerald text-white' : 'bg-gray-100 text-text-body hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-primary text-sm py-2 px-4">Search</button>
          </form>

          {/* Date Range */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              className="input-field text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              className="input-field text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <button
              onClick={() => fetchUsers(1)}
              className="btn-secondary text-sm py-2 px-3"
            >
              Apply
            </button>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-signal-red hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <button onClick={handleExportCSV} className="btn-secondary text-sm py-2 px-4 ml-auto">
            Download CSV
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No users found.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Registered</th>
                  <th className="pb-3 font-medium">Verified</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Subscription</th>
                  <th className="pb-3 font-medium">Expires</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <>
                    <tr key={user._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium">{user.name}</td>
                      <td className="py-3 text-gray-600">{user.email}</td>
                      <td className="py-3 text-gray-600">{user.phone}</td>
                      <td className="py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          user.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {user.isVerified ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleActive(user._id, user.isActive !== false)}
                          className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                            user.isActive !== false
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3">
                        {user.activeSubscription ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-emerald/10 text-brand-emerald">
                            {SEGMENT_LABELS[user.activeSubscription.segment] || user.activeSubscription.segment}{' '}
                            {PLAN_TYPE_LABELS[user.activeSubscription.planType] || user.activeSubscription.planType}
                          </span>
                        ) : user.latestSubscription ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                            {SUBSCRIPTION_STATUS_LABELS[user.latestSubscription.status] || user.latestSubscription.status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                      <td className="py-3">
                        {user.activeSubscription?.expiresAt ? (
                          <span className={`text-xs font-medium ${
                            daysLeft(user.activeSubscription.expiresAt) <= 7 ? 'text-signal-red' : 'text-gray-600'
                          }`}>
                            {formatDate(user.activeSubscription.expiresAt)}
                            <span className="text-gray-400 ml-1">({daysLeft(user.activeSubscription.expiresAt)}d)</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                          className="text-brand-emerald hover:underline text-xs"
                        >
                          {expandedUser === user._id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedUser === user._id && (
                      <tr key={`${user._id}-detail`} className="bg-gray-50">
                        <td colSpan={9} className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-gray-400 mb-1">User ID</p>
                              <p className="font-mono text-gray-600">{user._id}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Registered On</p>
                              <p className="font-medium">{formatDate(user.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Total Subscriptions</p>
                              <p className="font-medium">{user.totalSubscriptions}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Email Verified</p>
                              <p className="font-medium">{user.isVerified ? 'Yes' : 'No'}</p>
                            </div>
                            {user.activeSubscription && (
                              <>
                                <div>
                                  <p className="text-gray-400 mb-1">Active Plan</p>
                                  <p className="font-medium">{PLAN_TYPE_LABELS[user.activeSubscription.planType] || user.activeSubscription.planType}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-1">Segment</p>
                                  <p className="font-medium">{SEGMENT_LABELS[user.activeSubscription.segment] || user.activeSubscription.segment}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-1">Activated On</p>
                                  <p className="font-medium">{formatDate(user.activeSubscription.activatedAt)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-1">Expires On</p>
                                  <p className="font-medium text-signal-red">
                                    {formatDate(user.activeSubscription.expiresAt)} ({daysLeft(user.activeSubscription.expiresAt)} days left)
                                  </p>
                                </div>
                              </>
                            )}
                            {!user.activeSubscription && user.latestSubscription && (
                              <>
                                <div>
                                  <p className="text-gray-400 mb-1">Last Subscription</p>
                                  <p className="font-medium">{PLAN_TYPE_LABELS[user.latestSubscription.planType] || user.latestSubscription.planType}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-1">Last Status</p>
                                  <p className="font-medium">{SUBSCRIPTION_STATUS_LABELS[user.latestSubscription.status] || user.latestSubscription.status}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-1">Submitted On</p>
                                  <p className="font-medium">{formatDate(user.latestSubscription.createdAt)}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchUsers(p)}
                      className={`w-8 h-8 rounded text-xs font-medium ${
                        p === pagination.page ? 'bg-brand-emerald text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
