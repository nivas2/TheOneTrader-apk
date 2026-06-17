'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { SEGMENT_LABELS } from '@/lib/labels';

type Tab = 'compose' | 'history';

interface Template {
  id: string;
  name: string;
  title: string;
  body: string;
  variables: string[];
}

interface HistoryItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  recipientType: string;
  recipientFilter?: string;
  recipientCount: number;
  sentBy?: { name: string; email: string };
  createdAt: string;
}

interface SearchUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('compose');

  // Compose state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'segment' | 'individual'>('all');
  const [segment, setSegment] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [sending, setSending] = useState(false);

  // Dynamic segments from config
  const [configSegments, setConfigSegments] = useState<{ key: string; label: string }[]>([]);
  const segments = configSegments.length > 0
    ? configSegments
    : Object.entries(SEGMENT_LABELS).map(([key, label]) => ({ key, label }));

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Load templates and config on mount
  useEffect(() => {
    api.get('/admin/notifications/templates')
      .then((res) => setTemplates(res.data.data || []))
      .catch(() => {});
    api.get('/config')
      .then((res) => {
        const data = res.data.data;
        if (data?.segments?.length) setConfigSegments(data.segments);
      })
      .catch(() => {});
  }, []);

  // Load history when tab switches
  const fetchHistory = useCallback((page: number) => {
    setHistoryLoading(true);
    api.get(`/admin/notifications/history?page=${page}&limit=20`)
      .then((res) => {
        setHistory(res.data.data || []);
        setHistoryTotal(res.data.pagination?.total || 0);
      })
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyPage);
    }
  }, [activeTab, historyPage, fetchHistory]);

  // Template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setTitle(tmpl.title);
      setBody(tmpl.body);
    }
  };

  // User search for individual targeting
  useEffect(() => {
    if (recipientType !== 'individual' || userSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api.get(`/admin/notifications/users/search?q=${encodeURIComponent(userSearch)}`)
        .then((res) => setSearchResults(res.data.data || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch, recipientType]);

  // Insert variable into body field
  const insertVariable = (variable: string) => {
    setBody((prev) => prev + `{${variable}}`);
  };

  // Send notification
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    if (recipientType === 'segment' && !segment) {
      toast.error('Please select a segment');
      return;
    }
    if (recipientType === 'individual' && !selectedUser) {
      toast.error('Please select a user');
      return;
    }

    setSending(true);
    try {
      const payload: any = {
        title,
        body,
        recipientType,
        templateId: selectedTemplate || undefined,
      };
      if (recipientType === 'segment') {
        payload.segment = segment;
        const segLabel = segments.find((s) => s.key === segment)?.label || segment;
        payload.variables = { segment: segLabel };
      }
      if (recipientType === 'individual') {
        payload.userId = selectedUser?._id;
        payload.variables = { name: selectedUser?.name || '' };
      }

      const res = await api.post('/admin/notifications/send', payload);
      toast.success(res.data.message || 'Notification sent');

      // Reset form
      setTitle('');
      setBody('');
      setSelectedTemplate('');
      setSelectedUser(null);
      setUserSearch('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const recipientTypeLabel = (type: string) => {
    const map: Record<string, string> = { all: 'All Users', segment: 'Segment', individual: 'Individual', admins: 'Admins' };
    return map[type] || type;
  };

  const currentVariables = templates.find((t) => t.id === selectedTemplate)?.variables || [];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Notifications</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['compose', 'history'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-brand-emerald text-brand-emerald'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'compose' && (
        <div className="max-w-2xl">
          {/* Template Selector */}
          <div className="card p-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
            >
              <option value="">None (free text)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Recipient Type */}
          <div className="card p-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
            <div className="flex gap-2">
              {(['all', 'segment', 'individual'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setRecipientType(type); setSelectedUser(null); setUserSearch(''); }}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors capitalize ${
                    recipientType === type
                      ? 'bg-brand-emerald text-white border-brand-emerald'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type === 'all' ? 'All Users' : type}
                </button>
              ))}
            </div>

            {/* Segment picker */}
            {recipientType === 'segment' && (
              <div className="mt-3">
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                >
                  <option value="">Select segment...</option>
                  {segments.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* User search for individual */}
            {recipientType === 'individual' && (
              <div className="mt-3">
                {selectedUser ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{selectedUser.name}</p>
                      <p className="text-xs text-gray-500">{selectedUser.email} | {selectedUser.phone}</p>
                    </div>
                    <button onClick={() => { setSelectedUser(null); setUserSearch(''); }} className="text-sm text-red-500 hover:underline">
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by name, email, or phone..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                    />
                    {searchResults.length > 0 && (
                      <div className="mt-1 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                        {searchResults.map((u) => (
                          <button
                            key={u._id}
                            onClick={() => { setSelectedUser(u); setSearchResults([]); setUserSearch(''); }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email} | {u.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Title & Body */}
          <div className="card p-4 mb-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Notification body..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald resize-none"
              />
            </div>

            {/* Variable insertion buttons */}
            {currentVariables.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-gray-500 py-1">Insert variable:</span>
                {currentVariables.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 font-mono"
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {(title || body) && (
            <div className="card p-4 mb-4 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Preview</p>
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <p className="font-semibold text-sm">{title || 'Untitled'}</p>
                <p className="text-sm text-gray-600 mt-1">{body || 'No body'}</p>
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full bg-brand-emerald text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {historyLoading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : history.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-text-body">No notifications sent yet.</p>
            </div>
          ) : (
            <>
              <div className="card overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500 bg-gray-50/50">
                      <th className="px-3 py-3 font-medium">Date</th>
                      <th className="px-3 py-3 font-medium">Title</th>
                      <th className="px-3 py-3 font-medium">Body</th>
                      <th className="px-3 py-3 font-medium">Recipients</th>
                      <th className="px-3 py-3 font-medium">Sent By</th>
                      <th className="px-3 py-3 font-medium text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">{formatDate(item.createdAt)}</td>
                        <td className="px-3 py-3 font-medium max-w-[200px] truncate">{item.title}</td>
                        <td className="px-3 py-3 text-gray-600 max-w-[250px] truncate">{item.body}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                            {recipientTypeLabel(item.recipientType)}
                          </span>
                          {item.recipientFilter && (
                            <span className="text-xs text-gray-400 ml-1">({item.recipientFilter})</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{item.sentBy?.name || 'System'}</td>
                        <td className="px-3 py-3 text-right font-semibold">{item.recipientCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {historyTotal > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="px-3 py-1.5 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-500">
                    Page {historyPage} of {Math.ceil(historyTotal / 20)}
                  </span>
                  <button
                    onClick={() => setHistoryPage((p) => p + 1)}
                    disabled={historyPage >= Math.ceil(historyTotal / 20)}
                    className="px-3 py-1.5 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
