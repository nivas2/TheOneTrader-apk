'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const AVAILABLE_PAGES = [
  { href: '/admin/signals', label: 'Create Signal' },
  { href: '/admin/signals/history', label: 'Signal History' },
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/plans', label: 'Plans & Pricing' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/landing-page', label: 'Landing Page' },
  { href: '/admin/notifications', label: 'Notifications' },
  { href: '/admin/config', label: 'Settings' },
];

interface SubAdmin {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  allowedPages: string[];
  allowedSegments: string[];
  createdAt: string;
}

export default function SubAdminsPage() {
  const [subadmins, setSubadmins] = useState<SubAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [segments, setSegments] = useState<{ key: string; label: string }[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [allowedSegments, setAllowedSegments] = useState<string[]>([]);
  const [fullSegmentAccess, setFullSegmentAccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSubadmins();
    api.get('/config')
      .then((res) => {
        if (res.data.data?.segments) setSegments(res.data.data.segments);
      })
      .catch(() => {});
  }, []);

  const fetchSubadmins = () => {
    setIsLoading(true);
    api.get('/admin/sub-admins')
      .then((res) => setSubadmins(res.data.data || []))
      .catch(() => toast.error('Failed to load sub-admins'))
      .finally(() => setIsLoading(false));
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setAllowedPages([]);
    setAllowedSegments([]);
    setFullSegmentAccess(false);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (sa: SubAdmin) => {
    setEditingId(sa._id);
    setName(sa.name);
    setEmail(sa.email);
    setPhone(sa.phone);
    setPassword('');
    setAllowedPages(sa.allowedPages || []);
    const savedSegments = sa.allowedSegments || [];
    setAllowedSegments(savedSegments);
    // Detect full access: all configured segments are present
    const allKeys = segments.map((s) => s.key);
    setFullSegmentAccess(allKeys.length > 0 && allKeys.every((k) => savedSegments.includes(k)));
    setShowForm(true);
  };

  const togglePage = (href: string) => {
    setAllowedPages((prev) =>
      prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href]
    );
  };

  const toggleSegment = (key: string) => {
    setAllowedSegments((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || (!editingId && !password)) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSaving(true);
    try {
      const resolvedSegments = fullSegmentAccess ? segments.map((s) => s.key) : allowedSegments;
      const payload: any = { name, email, phone, allowedPages, allowedSegments: resolvedSegments };
      if (password) payload.password = password;

      if (editingId) {
        await api.put(`/admin/sub-admins/${editingId}`, payload);
        toast.success('Sub-admin updated');
      } else {
        payload.password = password;
        await api.post('/admin/sub-admins', payload);
        toast.success('Sub-admin created');
      }
      resetForm();
      fetchSubadmins();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const res = await api.patch(`/admin/sub-admins/${id}/toggle-active`);
      toast.success(res.data.data.isActive ? 'Sub-admin activated' : 'Sub-admin deactivated');
      fetchSubadmins();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: string, saName: string) => {
    const result = await Swal.fire({
      title: `Delete ${saName}?`,
      text: 'This will permanently remove this sub-admin account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/admin/sub-admins/${id}`);
      toast.success('Sub-admin deleted');
      fetchSubadmins();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Sub-Admins</h2>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary py-2 px-4 text-sm"
          >
            + Add Sub-Admin
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Sub-Admin' : 'Create Sub-Admin'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Name *</label>
                <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email *</label>
                <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Phone *</label>
                <input type="text" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Password {editingId ? '(leave blank to keep)' : '*'}</label>
                <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required={!editingId} minLength={6} />
              </div>
            </div>

            {/* Allowed Pages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Pages</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_PAGES.map((page) => (
                  <button
                    key={page.href}
                    type="button"
                    onClick={() => togglePage(page.href)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      allowedPages.includes(page.href)
                        ? 'bg-brand-emerald text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {page.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Allowed Segments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Segments (for signal creation)</label>
              <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fullSegmentAccess}
                  onChange={(e) => {
                    setFullSegmentAccess(e.target.checked);
                    if (e.target.checked) {
                      setAllowedSegments(segments.map((s) => s.key));
                    } else {
                      setAllowedSegments([]);
                    }
                  }}
                  className="rounded border-gray-300 text-brand-emerald"
                />
                Full Access (all segments)
              </label>
              {!fullSegmentAccess && (
                <div className="flex flex-wrap gap-2">
                  {segments.map((seg) => (
                    <button
                      key={seg.key}
                      type="button"
                      onClick={() => toggleSegment(seg.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        allowedSegments.includes(seg.key)
                          ? 'bg-brand-emerald text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {seg.label}
                    </button>
                  ))}
                  {segments.length === 0 && <p className="text-sm text-gray-400">No segments configured. Add segments in Settings first.</p>}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary py-2 px-6" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary py-2 px-6">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-Admins List */}
      {subadmins.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-400">No sub-admins yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subadmins.map((sa) => (
            <div key={sa._id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{sa.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sa.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {sa.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{sa.email} | {sa.phone}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(() => {
                      const saSegs = sa.allowedSegments || [];
                      const allKeys = segments.map((s) => s.key);
                      const isFullAccess = allKeys.length > 0 && allKeys.every((k) => saSegs.includes(k));
                      if (isFullAccess) {
                        return <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">Full Access (all segments)</span>;
                      }
                      if (saSegs.length === 0) {
                        return <span className="text-xs text-gray-400">No segments assigned</span>;
                      }
                      return saSegs.map((s) => (
                        <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {segments.find((seg) => seg.key === s)?.label || s}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleEdit(sa)} className="text-sm text-blue-600 hover:underline min-h-[36px] px-3">
                    Edit
                  </button>
                  <button onClick={() => handleToggleActive(sa._id)} className={`text-sm min-h-[36px] px-3 ${sa.isActive ? 'text-yellow-600 hover:underline' : 'text-green-600 hover:underline'}`}>
                    {sa.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(sa._id, sa.name)} className="text-sm text-red-600 hover:underline min-h-[36px] px-3">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
