'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export default function AdminLeadsPage() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0, limit: 20 });
  const [stats, setStats] = useState<{ total: number; today: number; thisWeek: number; thisMonth: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLeads = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await api.get(`/admin/leads?${params}`);
      setLeads(res.data.data.leads);
      setPagination(res.data.data.pagination);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  }, [search, startDate, endDate]);

  const fetchStats = () => {
    api.get('/admin/leads/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/leads/${id}`);
      setLeads((prev) => prev.filter((l) => l._id !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      fetchStats();
      toast.success('Lead deleted');
    } catch {
      toast.error('Failed to delete lead');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await api.get(`/admin/leads/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Export failed');
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

  const formatTime = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Leads</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-brand-emerald">{stats.today}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>
            <p className="text-xs text-gray-500">This Week</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.thisMonth}</p>
            <p className="text-xs text-gray-500">Last 30 Days</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-4">
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
            <button onClick={() => fetchLeads(1)} className="btn-secondary text-sm py-2 px-3">Apply</button>
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

      {/* Leads Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No leads found.</div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              {leads.map((lead) => (
                <div key={lead._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-text-heading">{lead.name}</p>
                      <p className="text-sm text-gray-500">{lead.email}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(lead._id)}
                      disabled={deletingId === lead._id}
                      className="text-xs text-signal-red hover:underline disabled:opacity-50"
                    >
                      {deletingId === lead._id ? '...' : 'Delete'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <a href={`tel:${lead.phone}`} className="text-brand-emerald hover:underline">{lead.phone}</a>
                    <span className="text-xs text-gray-400">{formatDate(lead.createdAt)} {formatTime(lead.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Submitted On</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 text-gray-400">{(pagination.page - 1) * pagination.limit + i + 1}</td>
                    <td className="py-3 font-medium">{lead.name}</td>
                    <td className="py-3 text-gray-600">{lead.email}</td>
                    <td className="py-3">
                      <a href={`tel:${lead.phone}`} className="text-brand-emerald hover:underline">{lead.phone}</a>
                    </td>
                    <td className="py-3 text-gray-500">
                      {formatDate(lead.createdAt)}{' '}
                      <span className="text-gray-400">{formatTime(lead.createdAt)}</span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDelete(lead._id)}
                        disabled={deletingId === lead._id}
                        className="text-xs text-signal-red hover:underline disabled:opacity-50"
                      >
                        {deletingId === lead._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
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
                      onClick={() => fetchLeads(p)}
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
