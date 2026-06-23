'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { SEGMENT_LABELS, SUBCATEGORY_LABELS } from '@/lib/labels';
import { useAuth } from '@/context/AuthContext';

export default function CreateSignalPage() {
  const { user } = useAuth();
  const isSubAdmin = user?.role === 'SUBADMIN';
  const userAllowedSegments = user?.allowedSegments || [];
  const [formData, setFormData] = useState({
    segment: 'INTRADAY',
    subCategory: 'EQUITY',
    targetIntervals: [] as string[],
    action: 'BUY',
    instrument: '',
    entryPriceRange: { min: '', max: '' },
    targetPrice: '',
    stopLoss: '',
    safeExit: '',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Plans for multi-select
  const [plans, setPlans] = useState<{ _id: string; name: string; segment: string }[]>([]);

  // Dynamic segments/categories from config
  const [configSegments, setConfigSegments] = useState<{ key: string; label: string }[]>([]);
  const [configCategories, setConfigCategories] = useState<{ key: string; label: string }[]>([]);

  // Instrument dropdown state
  const [instruments, setInstruments] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<{ idx: number; value: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/config').then((res) => {
      const data = res.data.data;
      setInstruments(data?.instruments || []);
      if (data?.segments?.length) setConfigSegments(data.segments);
      if (data?.categories?.length) setConfigCategories(data.categories);
    }).catch(() => {});
    api.get('/plans').then((res) => {
      const activePlans = (res.data.data || []).filter((p: any) => p.isActive);
      setPlans(activePlans.map((p: any) => ({ _id: p._id, name: p.name, segment: p.segment })));
    }).catch(() => {});
  }, []);

  // Derive segments/categories: prefer config, fall back to hardcoded labels
  const ALL_SEGMENTS = configSegments.length > 0
    ? configSegments.map((s) => s.key)
    : Object.keys(SEGMENT_LABELS);
  // Sub-admins only see their allowed segments
  const SEGMENTS = (isSubAdmin && userAllowedSegments.length > 0)
    ? ALL_SEGMENTS.filter((s) => userAllowedSegments.includes(s))
    : ALL_SEGMENTS;
  const segmentLabelMap: Record<string, string> = configSegments.length > 0
    ? Object.fromEntries(configSegments.map((s) => [s.key, s.label]))
    : SEGMENT_LABELS;
  const SUBCATEGORIES = configCategories.length > 0
    ? configCategories.map((c) => c.key)
    : Object.keys(SUBCATEGORY_LABELS);
  const categoryLabelMap: Record<string, string> = configCategories.length > 0
    ? Object.fromEntries(configCategories.map((c) => [c.key, c.label]))
    : SUBCATEGORY_LABELS;

  // Filter plans by selected segment
  const filteredPlans = plans.filter((p) => p.segment === formData.segment);

  const handleSegmentChange = (seg: string) => {
    setFormData((prev) => ({ ...prev, segment: seg, targetIntervals: [] }));
    const matchingPlans = plans.filter((p) => p.segment === seg);
    if (plans.length > 0 && matchingPlans.length === 0) {
      toast.error(`No active plans for this segment`);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setEditingInstrument(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredInstruments = formData.instrument
    ? instruments.filter((i) => i.includes(formData.instrument.toUpperCase()))
    : instruments;

  const saveInstruments = (updated: string[]) => {
    setInstruments(updated);
    api.put('/config', { instruments: updated }).catch(() => toast.error('Failed to save instruments'));
  };

  const handleDeleteInstrument = (idx: number) => {
    const updated = instruments.filter((_, i) => i !== idx);
    saveInstruments(updated);
  };

  const handleEditInstrument = (idx: number) => {
    setEditingInstrument({ idx, value: instruments[idx] });
  };

  const handleEditSave = () => {
    if (!editingInstrument) return;
    const trimmed = editingInstrument.value.trim().toUpperCase();
    if (!trimmed) return;
    const updated = [...instruments];
    updated[editingInstrument.idx] = trimmed;
    saveInstruments(updated);
    setEditingInstrument(null);
  };

  // Arrow key navigation between all form fields
  const handleArrowNav = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const key = e.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;

    const el = e.currentTarget;
    const isTextArea = el.tagName === 'TEXTAREA';
    const isTextField = el.type === 'text';

    // For text/textarea fields, only navigate when cursor is at boundaries
    if (isTextField || isTextArea) {
      const pos = el.selectionStart ?? 0;
      const len = el.value.length;
      if (key === 'ArrowLeft' && pos > 0) return;
      if (key === 'ArrowRight' && pos < len) return;
      if (isTextArea) return; // up/down should work normally in textarea
    }

    const fields = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-nav]')
    );
    const idx = fields.indexOf(el as any);
    if (idx === -1) return;

    let next = idx;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      next = Math.min(idx + 1, fields.length - 1);
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      next = Math.max(idx - 1, 0);
    }

    if (next !== idx) {
      e.preventDefault();
      fields[next].focus();
      // Select all content in the target field for quick overwrite
      if (fields[next].type === 'number' || fields[next].type === 'text') {
        fields[next].select();
      }
    }
  }, []);

  const togglePlan = (planName: string) => {
    setFormData((prev) => ({
      ...prev,
      targetIntervals: prev.targetIntervals.includes(planName)
        ? prev.targetIntervals.filter((i) => i !== planName)
        : [...prev.targetIntervals, planName],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.targetIntervals.length === 0) {
      toast.error('Select at least one plan');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        entryPriceRange: {
          min: parseFloat(formData.entryPriceRange.min),
          max: parseFloat(formData.entryPriceRange.max),
        },
        targetPrice: parseFloat(formData.targetPrice),
        stopLoss: parseFloat(formData.stopLoss),
        safeExit: formData.safeExit ? parseFloat(formData.safeExit) : undefined,
      };
      await api.post('/admin/signals', payload);
      toast.success('Signal created and broadcast!');
      // Add instrument to local list if new
      const upper = formData.instrument.toUpperCase();
      if (upper && !instruments.includes(upper)) {
        setInstruments((prev) => [...prev, upper].sort());
      }
      setFormData({
        segment: 'INTRADAY',
        subCategory: 'EQUITY',
        targetIntervals: [],
        action: 'BUY',
        instrument: '',
        entryPriceRange: { min: '', max: '' },
        targetPrice: '',
        stopLoss: '',
        safeExit: '',
        note: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create signal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Header with Action Toggle */}
        <div className="card mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Create Signal</h2>
            <div className="flex rounded-xl overflow-hidden border-2 border-gray-200">
              {['BUY', 'SELL'].map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setFormData({ ...formData, action })}
                  className={`px-8 py-2.5 font-bold text-sm transition-all ${
                    formData.action === action
                      ? action === 'BUY'
                        ? 'bg-signal-green text-white'
                        : 'bg-signal-red text-white'
                      : 'bg-white text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Segment & Category - Pill Selection */}
        <div className="card mb-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Segment</label>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSegmentChange(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.segment === s
                        ? 'bg-brand-emerald text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {segmentLabelMap[s] || s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {SUBCATEGORIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({ ...formData, subCategory: s })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.subCategory === s
                        ? 'bg-brand-emerald text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {categoryLabelMap[s] || s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plans</label>
              {filteredPlans.length === 0 ? (
                <p className="text-sm text-gray-400">No active plans for this segment. Create plans in Plans &amp; Pricing first.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredPlans.map((plan) => (
                    <button
                      key={plan._id}
                      type="button"
                      onClick={() => togglePlan(plan.name)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.targetIntervals.includes(plan.name)
                          ? 'bg-brand-emerald text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {plan.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instrument - Searchable dropdown */}
        <div className="card mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Instrument / Stock</label>
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              className="w-full text-xl font-semibold border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-brand-emerald focus:outline-none transition-colors"
              required
              data-nav
              onKeyDown={handleArrowNav}
              value={formData.instrument}
              onChange={(e) => {
                setFormData({ ...formData, instrument: e.target.value.toUpperCase() });
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search or type instrument name..."
              autoComplete="off"
            />
            {showDropdown && filteredInstruments.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredInstruments.map((inst, idx) => {
                  const realIdx = instruments.indexOf(inst);
                  return (
                    <div
                      key={inst}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 group"
                    >
                      {editingInstrument?.idx === realIdx ? (
                        <input
                          type="text"
                          className="flex-1 text-sm font-medium border border-brand-emerald rounded px-2 py-1 focus:outline-none"
                          value={editingInstrument.value}
                          onChange={(e) => setEditingInstrument({ ...editingInstrument, value: e.target.value.toUpperCase() })}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditingInstrument(null); }}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="flex-1 text-left text-sm font-medium text-gray-700"
                          onClick={() => {
                            setFormData({ ...formData, instrument: inst });
                            setShowDropdown(false);
                          }}
                        >
                          {inst}
                        </button>
                      )}
                      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingInstrument?.idx === realIdx ? (
                          <button
                            type="button"
                            onClick={handleEditSave}
                            className="text-xs text-brand-emerald hover:underline px-1"
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditInstrument(realIdx); }}
                            className="text-xs text-blue-500 hover:underline px-1"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteInstrument(realIdx); }}
                          className="text-xs text-signal-red hover:underline px-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Price Fields - Compact Grid */}
        <div className="card mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Price Levels</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entry Min</label>
              <input
                type="number"
                step="0.01"
                className="input-field text-center font-medium"
                required
                data-nav
                onKeyDown={handleArrowNav}
                value={formData.entryPriceRange.min}
                onChange={(e) => setFormData({ ...formData, entryPriceRange: { ...formData.entryPriceRange, min: e.target.value } })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entry Max</label>
              <input
                type="number"
                step="0.01"
                className="input-field text-center font-medium"
                required
                data-nav
                onKeyDown={handleArrowNav}
                value={formData.entryPriceRange.max}
                onChange={(e) => setFormData({ ...formData, entryPriceRange: { ...formData.entryPriceRange, max: e.target.value } })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target ↑</label>
              <input
                type="number"
                step="0.01"
                className="input-field text-center font-medium text-signal-green"
                required
                data-nav
                onKeyDown={handleArrowNav}
                value={formData.targetPrice}
                onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Stop Loss ↓</label>
              <input
                type="number"
                step="0.01"
                className="input-field text-center font-medium text-signal-red"
                required
                data-nav
                onKeyDown={handleArrowNav}
                value={formData.stopLoss}
                onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="mt-3 max-w-[calc(50%-6px)] sm:max-w-[calc(25%-9px)]">
            <label className="block text-xs text-gray-500 mb-1">Safe Exit (optional)</label>
            <input
              type="number"
              step="0.01"
              className="input-field text-center font-medium"
              data-nav
              onKeyDown={handleArrowNav}
              value={formData.safeExit}
              onChange={(e) => setFormData({ ...formData, safeExit: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Note - Collapsible feel */}
        <div className="card mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note (optional)</label>
          <textarea
            className="input-field text-sm"
            rows={2}
            data-nav
            onKeyDown={handleArrowNav}
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Quick note for traders..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg active:scale-[0.98] ${
            formData.action === 'BUY'
              ? 'bg-signal-green hover:bg-green-600'
              : 'bg-signal-red hover:bg-red-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Broadcasting...' : `📡 Broadcast ${formData.action} Signal`}
        </button>
      </form>
    </div>
  );
}
