'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { SEGMENT_LABELS, PLAN_TYPE_LABELS } from '@/lib/labels';

interface Plan {
  _id: string;
  name: string;
  planType: string;
  segment: string;
  durationDays: number;
  price: number;
  currency: string;
  features: string[];
  signalsPerDay: number;
  isActive: boolean;
}

const FALLBACK_DURATION_MAP: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  HALF_YEARLY: 180,
  YEARLY: 365,
};

const emptyForm = {
  name: '',
  planType: 'MONTHLY',
  segment: 'INTRADAY',
  durationDays: '30' as string,
  price: 0,
  currency: 'INR',
  features: '',
  signalsPerDay: '1' as string,
  isActive: true,
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [filterSegment, setFilterSegment] = useState('ALL');

  // Dynamic config data
  const [configSegments, setConfigSegments] = useState<{ key: string; label: string }[]>([]);
  const [configIntervals, setConfigIntervals] = useState<{ key: string; label: string }[]>([]);

  const SEGMENTS = configSegments.length > 0
    ? configSegments.map((s) => s.key)
    : Object.keys(SEGMENT_LABELS);
  const segmentLabelMap: Record<string, string> = configSegments.length > 0
    ? Object.fromEntries(configSegments.map((s) => [s.key, s.label]))
    : SEGMENT_LABELS;
  const PLAN_TYPES = configIntervals.length > 0
    ? configIntervals.map((i) => i.key)
    : Object.keys(PLAN_TYPE_LABELS);
  const planTypeLabelMap: Record<string, string> = configIntervals.length > 0
    ? Object.fromEntries(configIntervals.map((i) => [i.key, i.label]))
    : PLAN_TYPE_LABELS;
  const DURATION_MAP: Record<string, number> = configIntervals.length > 0
    ? Object.fromEntries(configIntervals.map((i) => [i.key, FALLBACK_DURATION_MAP[i.key] || 0]))
    : FALLBACK_DURATION_MAP;

  const fetchPlans = () => {
    api.get('/plans')
      .then((res) => setPlans(res.data.data))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPlans();
    api.get('/config').then((res) => {
      const data = res.data.data;
      if (data?.segments?.length) setConfigSegments(data.segments);
      if (data?.signalIntervals?.length) setConfigIntervals(data.signalIntervals);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price <= 0) {
      toast.error('Please fill name and a valid price');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        durationDays: parseInt(String(form.durationDays)) || 0,
        signalsPerDay: parseInt(String(form.signalsPerDay)) || 1,
        features: form.features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
      };

      if (editingId) {
        await api.put(`/plans/${editingId}`, payload);
        toast.success('Plan updated');
      } else {
        await api.post('/plans', payload);
        toast.success('Plan created');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchPlans();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setForm({
      name: plan.name,
      planType: plan.planType,
      segment: plan.segment,
      durationDays: String(plan.durationDays),
      price: plan.price,
      currency: plan.currency,
      features: plan.features.join('\n'),
      signalsPerDay: String(plan.signalsPerDay || 1),
      isActive: plan.isActive,
    });
    setEditingId(plan._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Plan?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/plans/${id}`);
      toast.success('Plan deleted');
      fetchPlans();
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleActive = async (plan: Plan) => {
    try {
      await api.put(`/plans/${plan._id}`, { isActive: !plan.isActive });
      fetchPlans();
    } catch {
      toast.error('Update failed');
    }
  };

  const filteredPlans = filterSegment === 'ALL'
    ? plans
    : plans.filter((p) => p.segment === filterSegment);

  if (isLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterSegment('ALL')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterSegment === 'ALL' ? 'bg-brand-emerald text-white' : 'bg-gray-100 text-text-body hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {SEGMENTS.map((seg) => (
            <button
              key={seg}
              onClick={() => setFilterSegment(seg)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterSegment === seg ? 'bg-brand-emerald text-white' : 'bg-gray-100 text-text-body hover:bg-gray-200'
              }`}
            >
              {segmentLabelMap[seg] || seg}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary text-sm py-2 px-4"
        >
          + Add Plan
        </button>
      </div>

      {/* Plans - Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredPlans.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">No plans found. Tap &quot;+ Add Plan&quot; to create one.</div>
        ) : (
          filteredPlans.map((plan) => (
            <div key={plan._id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-text-heading">{plan.name}</p>
                  <p className="text-xs text-gray-500">
                    {segmentLabelMap[plan.segment] || plan.segment} &middot; {planTypeLabelMap[plan.planType] || plan.planType}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(plan)}
                  className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                    plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {plan.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <span className="text-xs text-gray-400 block">Price</span>
                  <span className="font-semibold">{plan.currency} {plan.price.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Duration</span>
                  <span>{plan.durationDays}d</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Signals/Day</span>
                  <span>{plan.signalsPerDay || 1}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => handleEdit(plan)} className="text-blue-600 text-xs font-medium hover:underline min-h-[32px]">Edit</button>
                <button onClick={() => handleDelete(plan._id)} className="text-signal-red text-xs font-medium hover:underline min-h-[32px]">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Plans - Desktop Table */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Segment</th>
              <th className="pb-3 font-medium">Plan</th>
              <th className="pb-3 font-medium">Signals/Day</th>
              <th className="pb-3 font-medium">Duration</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  No plans found. Click &quot;+ Add Plan&quot; to create one.
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan) => (
                <tr key={plan._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium">{plan.name}</td>
                  <td className="py-3">{segmentLabelMap[plan.segment] || plan.segment}</td>
                  <td className="py-3">{planTypeLabelMap[plan.planType] || plan.planType}</td>
                  <td className="py-3">{plan.signalsPerDay || 1}</td>
                  <td className="py-3">{plan.durationDays} days</td>
                  <td className="py-3 font-semibold">{plan.currency} {plan.price.toLocaleString()}</td>
                  <td className="py-3">
                    <button
                      onClick={() => toggleActive(plan)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button onClick={() => handleEdit(plan)} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(plan._id)} className="text-signal-red hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Plan' : 'Create Plan'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Intraday Monthly Basic"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Segment</label>
                  <select className="input-field" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })}>
                    {SEGMENTS.map((s) => (<option key={s} value={s}>{segmentLabelMap[s] || s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration</label>
                  <select
                    className="input-field"
                    value={form.planType}
                    onChange={(e) => {
                      const mapped = DURATION_MAP[e.target.value];
                      setForm({
                        ...form,
                        planType: e.target.value,
                        durationDays: mapped ? String(mapped) : form.durationDays,
                      });
                    }}
                  >
                    {PLAN_TYPES.map((p) => (<option key={p} value={p}>{planTypeLabelMap[p] || p}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Signals Per Day</label>
                  <input type="number" className="input-field" min={1} value={form.signalsPerDay} onChange={(e) => setForm({ ...form, signalsPerDay: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (days)</label>
                  <input type="number" className="input-field" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <input type="number" className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Currency</label>
                  <input type="text" className="input-field" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Features (one per line)</label>
                <textarea
                  className="input-field font-mono text-sm"
                  rows={4}
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  placeholder="Real-time signals&#10;30s alarm alert&#10;WhatsApp support"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-brand-emerald"
                />
                Active (visible to customers)
              </label>
              <button type="submit" className="btn-primary w-full" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingId ? 'Update Plan' : 'Create Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
