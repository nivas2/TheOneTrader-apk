'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-100 text-blue-800',
  'Contacted': 'bg-purple-100 text-purple-800',
  'Callback Needed': 'bg-yellow-100 text-yellow-800',
  'Interested': 'bg-green-100 text-green-800',
  'Not Interested': 'bg-red-100 text-red-800',
  'Converted': 'bg-brand-emerald/10 text-brand-emerald',
};

export default function AdminLeadsPage() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0, limit: 10 });
  const [stats, setStats] = useState<{ total: number; today: number; thisWeek: number; thisMonth: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Status management
  const [statuses, setStatuses] = useState<string[]>([]);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [editStatuses, setEditStatuses] = useState<string[]>([]);

  // Notes
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState('');

  const fetchLeads = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get(`/admin/leads?${params}`);
      setLeads(res.data.data.leads);
      setPagination(res.data.data.pagination);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  }, [search, startDate, endDate, statusFilter]);

  const fetchStats = () => {
    api.get('/admin/leads/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => {});
  };

  const fetchStatuses = () => {
    api.get('/admin/leads/statuses')
      .then((res) => {
        setStatuses(res.data.data || []);
        setEditStatuses(res.data.data || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  useEffect(() => {
    fetchStats();
    fetchStatuses();
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.put(`/admin/leads/${id}`, { status: newStatus });
      setLeads((prev) => prev.map((l) => l._id === id ? { ...l, status: newStatus } : l));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleNotesSave = async (id: string) => {
    try {
      await api.put(`/admin/leads/${id}`, { notes: editingNotesValue });
      setLeads((prev) => prev.map((l) => l._id === id ? { ...l, notes: editingNotesValue } : l));
      setEditingNotesId(null);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const handleSaveStatuses = async () => {
    const cleaned = editStatuses.filter((s) => s.trim());
    if (cleaned.length === 0) {
      toast.error('At least one status is required');
      return;
    }
    try {
      await api.put('/admin/leads/statuses', { statuses: cleaned });
      setStatuses(cleaned);
      setShowStatusManager(false);
      toast.success('Statuses updated');
    } catch {
      toast.error('Failed to save statuses');
    }
  };

  const handleAddStatus = () => {
    const trimmed = newStatus.trim();
    if (!trimmed) return;
    if (editStatuses.includes(trimmed)) {
      toast.error('Status already exists');
      return;
    }
    setEditStatuses([...editStatuses, trimmed]);
    setNewStatus('');
  };

  const handleRemoveStatus = (index: number) => {
    setEditStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (statusFilter) params.set('status', statusFilter);

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
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';

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

      {/* Filters - Single Line */}
      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            className="input-field text-sm flex-1 min-w-[150px]"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="date"
            className="input-field text-sm w-[140px]"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            className="input-field text-sm w-[140px]"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
            className="input-field text-sm w-auto min-w-[120px]"
          >
            <option value="">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary text-sm py-2 px-3">Search</button>
          {(startDate || endDate || statusFilter) && (
            <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter(''); }} className="text-xs text-signal-red hover:underline">
              Clear
            </button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <button type="button" onClick={handleExportCSV} className="btn-secondary text-sm py-2 px-3">CSV</button>
            <button
              type="button"
              onClick={() => { setEditStatuses([...statuses]); setShowStatusManager(true); }}
              className="btn-secondary text-sm py-2 px-3"
              title="Manage lead statuses"
            >
              <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </form>
      </div>

      {/* Leads List */}
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
                      className="text-xs text-signal-red hover:underline disabled:opacity-50 min-h-[32px]"
                    >
                      {deletingId === lead._id ? '...' : 'Delete'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <a href={`tel:${lead.phone}`} className="text-brand-emerald hover:underline">{lead.phone}</a>
                    <span className="text-xs text-gray-400">{formatDate(lead.createdAt)} {formatTime(lead.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <select
                      value={lead.status || 'New'}
                      onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer appearance-none pr-6 ${getStatusColor(lead.status || 'New')}`}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => { setEditingNotesId(lead._id); setEditingNotesValue(lead.notes || ''); }}
                      className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
                    >
                      {lead.notes ? 'Edit Note' : '+ Note'}
                    </button>
                  </div>
                  {editingNotesId === lead._id && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        className="input-field text-xs flex-1"
                        placeholder="Add a note..."
                        value={editingNotesValue}
                        onChange={(e) => setEditingNotesValue(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleNotesSave(lead._id); }}
                      />
                      <button onClick={() => handleNotesSave(lead._id)} className="text-xs text-brand-emerald font-medium min-h-[32px]">Save</button>
                      <button onClick={() => setEditingNotesId(null)} className="text-xs text-gray-400 min-h-[32px]">Cancel</button>
                    </div>
                  )}
                  {lead.notes && editingNotesId !== lead._id && (
                    <p className="text-xs text-gray-400 mt-1 italic">{lead.notes}</p>
                  )}
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
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Notes</th>
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
                    <td className="py-3">
                      <select
                        value={lead.status || 'New'}
                        onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${getStatusColor(lead.status || 'New')}`}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 max-w-[200px]">
                      {editingNotesId === lead._id ? (
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            className="border border-gray-300 rounded px-2 py-1 text-xs flex-1 focus:ring-1 focus:ring-brand-emerald/30 focus:border-brand-emerald"
                            value={editingNotesValue}
                            onChange={(e) => setEditingNotesValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleNotesSave(lead._id); if (e.key === 'Escape') setEditingNotesId(null); }}
                          />
                          <button onClick={() => handleNotesSave(lead._id)} className="text-xs text-brand-emerald font-medium">Save</button>
                          <button onClick={() => setEditingNotesId(null)} className="text-xs text-gray-400">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingNotesId(lead._id); setEditingNotesValue(lead.notes || ''); }}
                          className={`text-xs hover:underline ${lead.notes ? 'text-gray-600' : 'text-gray-400'}`}
                          title={lead.notes || 'Click to add note'}
                        >
                          {lead.notes ? (lead.notes.length > 30 ? lead.notes.slice(0, 30) + '...' : lead.notes) : '+ Add note'}
                        </button>
                      )}
                    </td>
                    <td className="py-3 text-gray-500 whitespace-nowrap">
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => fetchLeads(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-2 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    Prev
                  </button>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter((p) => {
                      const current = pagination.page;
                      return p === 1 || p === pagination.pages || Math.abs(p - current) <= 2;
                    })
                    .map((p, idx, arr) => (
                      <span key={p} className="contents">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 py-1.5 text-xs text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => fetchLeads(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium ${
                            p === pagination.page ? 'bg-brand-emerald text-white' : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => fetchLeads(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-2 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status Manager Modal */}
      {showStatusManager && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowStatusManager(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-1">Manage Lead Statuses</h3>
            <p className="text-sm text-gray-500 mb-4">Add, remove, or reorder the status options for your leads.</p>

            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
              {editStatuses.map((status, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={`flex-1 text-sm px-3 py-2 rounded-lg ${getStatusColor(status)}`}>
                    {status}
                  </span>
                  <button
                    onClick={() => handleRemoveStatus(index)}
                    className="text-gray-400 hover:text-red-500 text-lg px-2"
                    title="Remove status"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                className="input-field flex-1 text-sm"
                placeholder="New status name..."
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStatus(); } }}
              />
              <button onClick={handleAddStatus} className="btn-secondary text-sm py-2 px-3">Add</button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowStatusManager(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button onClick={handleSaveStatuses} className="flex-1 btn-primary py-2.5 text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
