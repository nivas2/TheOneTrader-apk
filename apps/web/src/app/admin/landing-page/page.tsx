'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { SOCIAL_ICONS, PLATFORM_OPTIONS } from '@/components/Footer';

interface SectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}

function Section({ title, isOpen, onToggle, onSave, saving, children }: SectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-lg font-semibold text-text-heading">{title}</h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          {children}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-6 py-2 bg-brand-emerald text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
      />
    </div>
  );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex items-center flex-shrink-0 ${
        enabled ? 'bg-brand-emerald' : 'bg-gray-300'
      }`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </div>
  );
}

function DynamicList({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  const [disabledIndices, setDisabledIndices] = useState<Set<number>>(new Set());
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {items.map((item, i) => (
        <div key={i} className={`flex gap-2 mb-2 items-center transition-opacity ${disabledIndices.has(i) ? 'opacity-40' : ''}`}>
          <input
            type="text"
            value={item}
            disabled={disabledIndices.has(i)}
            onChange={(e) => {
              const newItems = [...items];
              newItems[i] = e.target.value;
              onChange(newItems);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
          />
          <ToggleSwitch
            enabled={!disabledIndices.has(i)}
            onToggle={() => {
              const next = new Set(disabledIndices);
              if (next.has(i)) next.delete(i); else next.add(i);
              setDisabledIndices(next);
              // Remove disabled items from the data
              if (!next.has(i)) return; // just re-enabled, no removal
              onChange(items.filter((_, idx) => !next.has(idx)));
              setDisabledIndices(new Set());
            }}
          />
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ''])}
        className="text-sm text-brand-emerald hover:underline"
      >
        + Add Item
      </button>
    </div>
  );
}

export default function AdminLandingPage() {
  const [content, setContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    api.get('/landing-content')
      .then((res) => setContent(res.data.data))
      .catch(() => toast.error('Failed to load landing page content'))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const stripDisabled = (data: any): any => {
    if (Array.isArray(data)) {
      return data.filter((item: any) => !item?._disabled).map((item: any) => stripDisabled(item));
    }
    if (data && typeof data === 'object') {
      const { _disabled, ...rest } = data;
      const result: any = {};
      for (const key of Object.keys(rest)) {
        result[key] = stripDisabled(rest[key]);
      }
      return result;
    }
    return data;
  };

  const saveSection = async (sectionKey: string) => {
    setSavingSection(sectionKey);
    try {
      const payload: any = {};
      payload[sectionKey] = stripDisabled(content[sectionKey]);
      const res = await api.put('/landing-content', payload);
      setContent(res.data.data);
      toast.success(`${sectionKey} saved successfully`);
    } catch {
      toast.error(`Failed to save ${sectionKey}`);
    } finally {
      setSavingSection(null);
    }
  };

  const updateField = (section: string, field: string, value: any) => {
    setContent((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const updateNestedField = (section: string, nested: string, field: string, value: any) => {
    setContent((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nested]: { ...prev[section][nested], [field]: value },
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-emerald" />
      </div>
    );
  }

  if (!content) {
    return <div className="text-center py-20 text-gray-500">Failed to load content</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-heading">Landing Page Editor</h1>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Preview Landing Page
        </Link>
      </div>

      <div className="space-y-4">
        {/* Lead Capture Modal */}
        <Section
          title="Lead Capture Modal (Popup)"
          isOpen={!!openSections.leadCaptureModal}
          onToggle={() => toggleSection('leadCaptureModal')}
          onSave={() => saveSection('leadCaptureModal')}
          saving={savingSection === 'leadCaptureModal'}
        >
          <div className="grid gap-4">
            <p className="text-sm text-gray-500">Configure the lead capture popup that appears on the landing page. All text and timing is editable here.</p>
            <InputField label="Badge Text" value={content.leadCaptureModal?.badgeText} onChange={(v) => updateField('leadCaptureModal', 'badgeText', v)} placeholder="e.g. Limited Time Offer" />
            <InputField label="Heading" value={content.leadCaptureModal?.heading} onChange={(v) => updateField('leadCaptureModal', 'heading', v)} placeholder="e.g. Get Premium Trading Signals" />
            <TextareaField label="Subheading" value={content.leadCaptureModal?.subheading} onChange={(v) => updateField('leadCaptureModal', 'subheading', v)} placeholder="e.g. Enter your details to get started..." rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Button Text" value={content.leadCaptureModal?.buttonText} onChange={(v) => updateField('leadCaptureModal', 'buttonText', v)} placeholder="e.g. Request a Callback" />
              <InputField label="Skip Text" value={content.leadCaptureModal?.skipText} onChange={(v) => updateField('leadCaptureModal', 'skipText', v)} placeholder="e.g. Skip for now" />
            </div>
            <InputField label="Footer Text (below button)" value={content.leadCaptureModal?.footerText} onChange={(v) => updateField('leadCaptureModal', 'footerText', v)} placeholder="e.g. Our experts will guide you personally" />
            <InputField label="Success Message (after submit)" value={content.leadCaptureModal?.successMessage} onChange={(v) => updateField('leadCaptureModal', 'successMessage', v)} placeholder="e.g. Thank you for your interest!" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Popup Delay (seconds)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={content.leadCaptureModal?.delayMs != null ? content.leadCaptureModal.delayMs / 1000 : 3}
                  onChange={(e) => updateField('leadCaptureModal', 'delayMs', Math.max(0, Number(e.target.value)) * 1000)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                />
                <p className="text-xs text-gray-400 mt-1">How many seconds to wait before showing the popup (0 = instant)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Show Every Visit</label>
                <select
                  value={content.leadCaptureModal?.showEveryVisit ? 'true' : 'false'}
                  onChange={(e) => updateField('leadCaptureModal', 'showEveryVisit', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                >
                  <option value="true">Yes - show on every page visit</option>
                  <option value="false">No - show once per session</option>
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* Hero Section */}
        <Section
          title="Hero Section"
          isOpen={!!openSections.hero}
          onToggle={() => toggleSection('hero')}
          onSave={() => saveSection('hero')}
          saving={savingSection === 'hero'}
        >
          <div className="grid gap-4">
            <InputField label="Badge Text" value={content.hero?.badgeText} onChange={(v) => updateField('hero', 'badgeText', v)} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Heading Line 1" value={content.hero?.headingLine1} onChange={(v) => updateField('hero', 'headingLine1', v)} />
              <InputField label="Heading Line 2" value={content.hero?.headingLine2} onChange={(v) => updateField('hero', 'headingLine2', v)} />
            </div>
            <DynamicList
              label="Typewriter Phrases"
              items={content.hero?.typewriterPhrases || []}
              onChange={(v) => updateField('hero', 'typewriterPhrases', v)}
            />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Profit Label" value={content.hero?.profitLabel} onChange={(v) => updateField('hero', 'profitLabel', v)} placeholder="e.g. Total Profit Generated" />
              <InputField label="Profit Amount (in Indian format)" value={content.hero?.profitAmount} onChange={(v) => updateField('hero', 'profitAmount', v)} placeholder="e.g. 12,73,406" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Primary CTA Text" value={content.hero?.ctaPrimaryText} onChange={(v) => updateField('hero', 'ctaPrimaryText', v)} />
              <InputField label="Primary CTA Link" value={content.hero?.ctaPrimaryLink} onChange={(v) => updateField('hero', 'ctaPrimaryLink', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Secondary CTA Text" value={content.hero?.ctaSecondaryText} onChange={(v) => updateField('hero', 'ctaSecondaryText', v)} />
              <InputField label="Secondary CTA Link" value={content.hero?.ctaSecondaryLink} onChange={(v) => updateField('hero', 'ctaSecondaryLink', v)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Online Traders Count</label>
                <input
                  type="number"
                  min="0"
                  value={content.hero?.onlineTraders ?? 47}
                  onChange={(e) => updateField('hero', 'onlineTraders', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                />
              </div>
              <InputField label="Online Traders Suffix" value={content.hero?.onlineTradersSuffix} onChange={(v) => updateField('hero', 'onlineTradersSuffix', v)} />
              <InputField label="Joined Today Text" value={content.hero?.joinedTodayText} onChange={(v) => updateField('hero', 'joinedTodayText', v)} />
            </div>
          </div>
        </Section>

        {/* Hero Carousel Cards */}
        <Section
          title="Hero Carousel Cards"
          isOpen={!!openSections.heroCards}
          onToggle={() => toggleSection('heroCards')}
          onSave={() => saveSection('heroCards')}
          saving={savingSection === 'heroCards'}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">These cards rotate in the hero section carousel. You can add trade showcase cards or custom promotional banners.</p>
            {(content.heroCards || []).map((card: any, i: number) => (
              <div key={i} className={`border border-gray-200 rounded-lg p-4 space-y-3 transition-opacity ${card._disabled ? 'opacity-40' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700">Card #{i + 1}</span>
                  <div className="flex items-center gap-3">
                    {/* Move up/down */}
                    {i > 0 && (
                      <button
                        onClick={() => {
                          const cards = [...content.heroCards];
                          [cards[i - 1], cards[i]] = [cards[i], cards[i - 1]];
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Move Up
                      </button>
                    )}
                    {i < (content.heroCards || []).length - 1 && (
                      <button
                        onClick={() => {
                          const cards = [...content.heroCards];
                          [cards[i], cards[i + 1]] = [cards[i + 1], cards[i]];
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Move Down
                      </button>
                    )}
                    <ToggleSwitch
                      enabled={!card._disabled}
                      onToggle={() => {
                        const cards = [...content.heroCards];
                        cards[i] = { ...cards[i], _disabled: !card._disabled };
                        setContent((prev: any) => ({ ...prev, heroCards: cards }));
                      }}
                    />
                  </div>
                </div>

                {/* Card Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
                  <select
                    value={card.type || 'trade'}
                    onChange={(e) => {
                      const cards = [...content.heroCards];
                      cards[i] = { ...cards[i], type: e.target.value };
                      setContent((prev: any) => ({ ...prev, heroCards: cards }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                  >
                    <option value="trade">Trade Card (Showcase a winning signal)</option>
                    <option value="banner">Custom Banner (Promotional / Ad)</option>
                    <option value="image">Image Card (Upload custom image)</option>
                  </select>
                </div>

                {card.type === 'banner' ? (
                  /* Banner card fields */
                  <div className="grid gap-3 bg-purple-50 rounded-lg p-3">
                    <InputField
                      label="Heading"
                      value={card.heading || ''}
                      onChange={(v) => {
                        const cards = [...content.heroCards];
                        cards[i] = { ...cards[i], heading: v };
                        setContent((prev: any) => ({ ...prev, heroCards: cards }));
                      }}
                      placeholder="e.g. Join 2,500+ Traders"
                    />
                    <TextareaField
                      label="Description"
                      value={card.description || ''}
                      onChange={(v) => {
                        const cards = [...content.heroCards];
                        cards[i] = { ...cards[i], description: v };
                        setContent((prev: any) => ({ ...prev, heroCards: cards }));
                      }}
                      rows={2}
                      placeholder="e.g. Get expert signals with 85%+ accuracy"
                    />
                    <InputField
                      label="Background Gradient"
                      value={card.bgGradient || ''}
                      onChange={(v) => {
                        const cards = [...content.heroCards];
                        cards[i] = { ...cards[i], bgGradient: v };
                        setContent((prev: any) => ({ ...prev, heroCards: cards }));
                      }}
                      placeholder="e.g. from-brand-emerald to-emerald-700"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        label="CTA Button Text"
                        value={card.ctaText || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], ctaText: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. Start Free Trial"
                      />
                      <InputField
                        label="CTA Button Link"
                        value={card.ctaLink || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], ctaLink: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. /register"
                      />
                    </div>
                  </div>
                ) : card.type === 'image' ? (
                  /* Image card fields */
                  <div className="grid gap-3 bg-blue-50 rounded-lg p-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image</label>
                      {card.imageUrl && (
                        <div className="mb-2">
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || ''}${card.imageUrl}`}
                            alt="Hero card preview"
                            className="w-40 h-28 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('image', file);
                          try {
                            const res = await api.post('/landing-content/upload-hero-image', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            if (res.data.success) {
                              const cards = [...content.heroCards];
                              cards[i] = { ...cards[i], imageUrl: res.data.data.imageUrl };
                              setContent((prev: any) => ({ ...prev, heroCards: cards }));
                              toast.success('Image uploaded');
                            }
                          } catch {
                            toast.error('Failed to upload image');
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300/20 focus:border-blue-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or WebP. Max 5MB.</p>
                    </div>
                    <InputField
                      label="Caption"
                      value={card.caption || ''}
                      onChange={(v) => {
                        const cards = [...content.heroCards];
                        cards[i] = { ...cards[i], caption: v };
                        setContent((prev: any) => ({ ...prev, heroCards: cards }));
                      }}
                      placeholder="e.g. Special offer this month!"
                    />
                  </div>
                ) : (
                  /* Trade card fields */
                  <div className="grid gap-3 bg-green-50 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                        <select
                          value={card.action || 'BUY'}
                          onChange={(e) => {
                            const cards = [...content.heroCards];
                            cards[i] = { ...cards[i], action: e.target.value };
                            setContent((prev: any) => ({ ...prev, heroCards: cards }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                        >
                          <option value="BUY">BUY</option>
                          <option value="SELL">SELL</option>
                        </select>
                      </div>
                      <InputField
                        label="Instrument"
                        value={card.instrument || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], instrument: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. RELIANCE"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        label="Segment"
                        value={card.segment || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], segment: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. Intraday"
                      />
                      <InputField
                        label="Category"
                        value={card.category || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], category: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. Equity"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        label="Entry Min"
                        value={card.entryMin || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], entryMin: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. ₹2,540"
                      />
                      <InputField
                        label="Entry Max"
                        value={card.entryMax || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], entryMax: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. ₹2,555"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <InputField
                        label="Target"
                        value={card.target || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], target: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. ₹2,620"
                      />
                      <InputField
                        label="Stop Loss"
                        value={card.stopLoss || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], stopLoss: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. ₹2,510"
                      />
                      <InputField
                        label="P&L"
                        value={card.pnl || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], pnl: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. +24.8%"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        label="Status Label"
                        value={card.statusLabel || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], statusLabel: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. Target Hit"
                      />
                      <InputField
                        label="Badge Label"
                        value={card.badgeLabel || ''}
                        onChange={(v) => {
                          const cards = [...content.heroCards];
                          cards[i] = { ...cards[i], badgeLabel: v };
                          setContent((prev: any) => ({ ...prev, heroCards: cards }));
                        }}
                        placeholder="e.g. Top Signal"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Card Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const cards = [
                    ...(content.heroCards || []),
                    {
                      type: 'trade',
                      action: 'BUY',
                      instrument: '',
                      segment: '',
                      category: '',
                      entryMin: '',
                      entryMax: '',
                      target: '',
                      stopLoss: '',
                      pnl: '',
                      statusLabel: 'Target Hit',
                      badgeLabel: 'Top Signal',
                    },
                  ];
                  setContent((prev: any) => ({ ...prev, heroCards: cards }));
                }}
                className="text-sm text-brand-emerald hover:underline"
              >
                + Add Trade Card
              </button>
              <button
                onClick={() => {
                  const cards = [
                    ...(content.heroCards || []),
                    {
                      type: 'banner',
                      heading: '',
                      description: '',
                      bgGradient: 'from-brand-emerald to-emerald-700',
                      ctaText: '',
                      ctaLink: '/register',
                    },
                  ];
                  setContent((prev: any) => ({ ...prev, heroCards: cards }));
                }}
                className="text-sm text-purple-600 hover:underline"
              >
                + Add Banner Card
              </button>
              <button
                onClick={() => {
                  const cards = [
                    ...(content.heroCards || []),
                    {
                      type: 'image',
                      imageUrl: '',
                      caption: '',
                    },
                  ];
                  setContent((prev: any) => ({ ...prev, heroCards: cards }));
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add Image Card
              </button>
            </div>
          </div>
        </Section>

        {/* Social Proof */}
        <Section
          title="Social Proof Metrics"
          isOpen={!!openSections.socialProof}
          onToggle={() => toggleSection('socialProof')}
          onSave={() => saveSection('socialProof')}
          saving={savingSection === 'socialProof'}
        >
          <div className="space-y-3">
            {(content.socialProof || []).map((item: any, i: number) => (
              <div key={i} className={`flex gap-3 items-center transition-opacity ${item._disabled ? 'opacity-40' : ''}`}>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Value</label>
                  <input
                    type="text"
                    value={item.value || ''}
                    disabled={item._disabled}
                    onChange={(e) => {
                      const arr = [...content.socialProof];
                      arr[i] = { ...arr[i], value: e.target.value };
                      setContent((prev: any) => ({ ...prev, socialProof: arr }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Label</label>
                  <input
                    type="text"
                    value={item.label || ''}
                    disabled={item._disabled}
                    onChange={(e) => {
                      const arr = [...content.socialProof];
                      arr[i] = { ...arr[i], label: e.target.value };
                      setContent((prev: any) => ({ ...prev, socialProof: arr }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                  />
                </div>
                <ToggleSwitch
                  enabled={!item._disabled}
                  onToggle={() => {
                    const arr = [...content.socialProof];
                    if (!item._disabled) {
                      arr[i] = { ...arr[i], _disabled: true };
                    } else {
                      const { _disabled, ...rest } = arr[i];
                      arr[i] = rest;
                    }
                    setContent((prev: any) => ({ ...prev, socialProof: arr }));
                  }}
                />
              </div>
            ))}
            <button
              onClick={() => {
                setContent((prev: any) => ({
                  ...prev,
                  socialProof: [...(prev.socialProof || []), { value: '', label: '' }],
                }));
              }}
              className="text-sm text-brand-emerald hover:underline"
            >
              + Add Metric
            </button>
          </div>
        </Section>

        {/* What We Offer */}
        <Section
          title="What We Offer"
          isOpen={!!openSections.whatWeOffer}
          onToggle={() => toggleSection('whatWeOffer')}
          onSave={() => saveSection('whatWeOffer')}
          saving={savingSection === 'whatWeOffer'}
        >
          <div className="grid gap-4">
            <InputField label="Section Heading" value={content.whatWeOffer?.heading} onChange={(v) => updateField('whatWeOffer', 'heading', v)} />
            <TextareaField label="Section Subheading" value={content.whatWeOffer?.subheading} onChange={(v) => updateField('whatWeOffer', 'subheading', v)} />

            <h4 className="font-semibold text-gray-700 mt-4 border-b pb-2">Segments</h4>
            {(content.whatWeOffer?.segments || []).map((seg: any, i: number) => (
              <div key={i} className={`border border-gray-200 rounded-lg p-4 space-y-3 transition-opacity ${seg._disabled ? 'opacity-40' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700">Segment #{i + 1}: {seg.title}</span>
                  <ToggleSwitch
                    enabled={!seg._disabled}
                    onToggle={() => {
                      const segs = [...content.whatWeOffer.segments];
                      segs[i] = { ...segs[i], _disabled: !seg._disabled };
                      updateField('whatWeOffer', 'segments', segs);
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="ID"
                    value={seg.id}
                    onChange={(v) => {
                      const segs = [...content.whatWeOffer.segments];
                      segs[i] = { ...segs[i], id: v };
                      updateField('whatWeOffer', 'segments', segs);
                    }}
                  />
                  <InputField
                    label="Title"
                    value={seg.title}
                    onChange={(v) => {
                      const segs = [...content.whatWeOffer.segments];
                      segs[i] = { ...segs[i], title: v };
                      updateField('whatWeOffer', 'segments', segs);
                    }}
                  />
                </div>
                <InputField
                  label="Tagline"
                  value={seg.tagline}
                  onChange={(v) => {
                    const segs = [...content.whatWeOffer.segments];
                    segs[i] = { ...segs[i], tagline: v };
                    updateField('whatWeOffer', 'segments', segs);
                  }}
                />
                <TextareaField
                  label="Description"
                  value={seg.description}
                  onChange={(v) => {
                    const segs = [...content.whatWeOffer.segments];
                    segs[i] = { ...segs[i], description: v };
                    updateField('whatWeOffer', 'segments', segs);
                  }}
                />
                <DynamicList
                  label="Features (one per line)"
                  items={seg.features || []}
                  onChange={(v) => {
                    const segs = [...content.whatWeOffer.segments];
                    segs[i] = { ...segs[i], features: v };
                    updateField('whatWeOffer', 'segments', segs);
                  }}
                />
              </div>
            ))}
            <button
              onClick={() => {
                const segs = [...(content.whatWeOffer?.segments || []), { id: '', title: '', tagline: '', description: '', features: [] }];
                updateField('whatWeOffer', 'segments', segs);
              }}
              className="text-sm text-brand-emerald hover:underline"
            >
              + Add Segment
            </button>

            <h4 className="font-semibold text-gray-700 mt-4 border-b pb-2">All Segments CTA</h4>
            <InputField label="CTA Title" value={content.whatWeOffer?.allSegmentsCTA?.title} onChange={(v) => updateNestedField('whatWeOffer', 'allSegmentsCTA', 'title', v)} />
            <TextareaField label="CTA Description" value={content.whatWeOffer?.allSegmentsCTA?.description} onChange={(v) => updateNestedField('whatWeOffer', 'allSegmentsCTA', 'description', v)} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="CTA Button Text" value={content.whatWeOffer?.allSegmentsCTA?.buttonText} onChange={(v) => updateNestedField('whatWeOffer', 'allSegmentsCTA', 'buttonText', v)} />
              <InputField label="CTA Button Link" value={content.whatWeOffer?.allSegmentsCTA?.buttonLink} onChange={(v) => updateNestedField('whatWeOffer', 'allSegmentsCTA', 'buttonLink', v)} placeholder="/register" />
            </div>
          </div>
        </Section>

        {/* Performance */}
        <Section
          title="Performance Stats"
          isOpen={!!openSections.performance}
          onToggle={() => toggleSection('performance')}
          onSave={() => saveSection('performance')}
          saving={savingSection === 'performance'}
        >
          <div className="grid gap-4">
            <InputField label="Heading" value={content.performance?.heading} onChange={(v) => updateField('performance', 'heading', v)} />
            <InputField label="Subheading" value={content.performance?.subheading} onChange={(v) => updateField('performance', 'subheading', v)} />
          </div>
        </Section>

        {/* How It Works */}
        <Section
          title="How It Works"
          isOpen={!!openSections.howItWorks}
          onToggle={() => toggleSection('howItWorks')}
          onSave={() => saveSection('howItWorks')}
          saving={savingSection === 'howItWorks'}
        >
          <div className="grid gap-4">
            <InputField label="Heading" value={content.howItWorks?.heading} onChange={(v) => updateField('howItWorks', 'heading', v)} />
            <InputField label="Subheading" value={content.howItWorks?.subheading} onChange={(v) => updateField('howItWorks', 'subheading', v)} />
            <h4 className="font-semibold text-gray-700 mt-2 border-b pb-2">Steps</h4>
            {(content.howItWorks?.steps || []).map((step: any, i: number) => (
              <div key={i} className={`border border-gray-200 rounded-lg p-4 space-y-3 transition-opacity ${step._disabled ? 'opacity-40' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700">Step #{i + 1}</span>
                  <ToggleSwitch
                    enabled={!step._disabled}
                    onToggle={() => {
                      const steps = [...content.howItWorks.steps];
                      steps[i] = { ...steps[i], _disabled: !step._disabled };
                      updateField('howItWorks', 'steps', steps);
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <InputField
                    label="Step Number"
                    value={step.stepNumber}
                    onChange={(v) => {
                      const steps = [...content.howItWorks.steps];
                      steps[i] = { ...steps[i], stepNumber: v };
                      updateField('howItWorks', 'steps', steps);
                    }}
                  />
                  <InputField
                    label="Title"
                    value={step.title}
                    onChange={(v) => {
                      const steps = [...content.howItWorks.steps];
                      steps[i] = { ...steps[i], title: v };
                      updateField('howItWorks', 'steps', steps);
                    }}
                  />
                </div>
                <TextareaField
                  label="Description"
                  value={step.description}
                  onChange={(v) => {
                    const steps = [...content.howItWorks.steps];
                    steps[i] = { ...steps[i], description: v };
                    updateField('howItWorks', 'steps', steps);
                  }}
                  rows={2}
                />
              </div>
            ))}
            <button
              onClick={() => {
                const steps = [...(content.howItWorks?.steps || []), { stepNumber: '', title: '', description: '' }];
                updateField('howItWorks', 'steps', steps);
              }}
              className="text-sm text-brand-emerald hover:underline"
            >
              + Add Step
            </button>
          </div>
        </Section>

        {/* Testimonials */}
        <Section
          title="Testimonials Section"
          isOpen={!!openSections.testimonials}
          onToggle={() => toggleSection('testimonials')}
          onSave={() => saveSection('testimonials')}
          saving={savingSection === 'testimonials'}
        >
          <InputField label="Section Heading" value={content.testimonials?.heading} onChange={(v) => updateField('testimonials', 'heading', v)} />
        </Section>

        {/* Countdown */}
        <Section
          title="Countdown / Urgency"
          isOpen={!!openSections.countdown}
          onToggle={() => toggleSection('countdown')}
          onSave={() => saveSection('countdown')}
          saving={savingSection === 'countdown'}
        >
          <div className="grid gap-4">
            <InputField label="Heading (use {spots} for spots placeholder)" value={content.countdown?.heading} onChange={(v) => updateField('countdown', 'heading', v)} />
            <InputField label="Spots Count Text" value={content.countdown?.spotsCount} onChange={(v) => updateField('countdown', 'spotsCount', v)} />
            <InputField label="Subheading" value={content.countdown?.subheading} onChange={(v) => updateField('countdown', 'subheading', v)} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Button Text" value={content.countdown?.buttonText} onChange={(v) => updateField('countdown', 'buttonText', v)} />
              <InputField label="Button Link" value={content.countdown?.buttonLink} onChange={(v) => updateField('countdown', 'buttonLink', v)} />
            </div>
          </div>
        </Section>

        {/* Final CTA */}
        <Section
          title="Final CTA Section"
          isOpen={!!openSections.finalCTA}
          onToggle={() => toggleSection('finalCTA')}
          onSave={() => saveSection('finalCTA')}
          saving={savingSection === 'finalCTA'}
        >
          <div className="grid gap-4">
            <InputField label="Heading" value={content.finalCTA?.heading} onChange={(v) => updateField('finalCTA', 'heading', v)} />
            <TextareaField label="Subheading" value={content.finalCTA?.subheading} onChange={(v) => updateField('finalCTA', 'subheading', v)} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Primary Button Text" value={content.finalCTA?.primaryButtonText} onChange={(v) => updateField('finalCTA', 'primaryButtonText', v)} />
              <InputField label="Primary Button Link" value={content.finalCTA?.primaryButtonLink} onChange={(v) => updateField('finalCTA', 'primaryButtonLink', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Secondary Button Text" value={content.finalCTA?.secondaryButtonText} onChange={(v) => updateField('finalCTA', 'secondaryButtonText', v)} />
              <InputField label="Secondary Button Link" value={content.finalCTA?.secondaryButtonLink} onChange={(v) => updateField('finalCTA', 'secondaryButtonLink', v)} />
            </div>
            <InputField label="Footer Text" value={content.finalCTA?.footerText} onChange={(v) => updateField('finalCTA', 'footerText', v)} />
          </div>
        </Section>

        {/* FOMO */}
        <Section
          title="FOMO Toast (Names & Cities)"
          isOpen={!!openSections.fomo}
          onToggle={() => toggleSection('fomo')}
          onSave={() => saveSection('fomo')}
          saving={savingSection === 'fomo'}
        >
          <div className="grid gap-6">
            <DynamicList
              label="Names"
              items={content.fomo?.names || []}
              onChange={(v) => updateField('fomo', 'names', v)}
            />
            <DynamicList
              label="Cities"
              items={content.fomo?.cities || []}
              onChange={(v) => updateField('fomo', 'cities', v)}
            />
          </div>
        </Section>

        {/* Footer */}
        <Section
          title="Footer"
          isOpen={!!openSections.footer}
          onToggle={() => toggleSection('footer')}
          onSave={() => saveSection('footer')}
          saving={savingSection === 'footer'}
        >
          <div className="grid gap-4">
            <TextareaField label="Brand Description" value={content.footer?.brandDescription} onChange={(v) => updateField('footer', 'brandDescription', v)} placeholder="Short description shown in the footer" rows={2} />
            <InputField label="Contact Email" value={content.footer?.email} onChange={(v) => updateField('footer', 'email', v)} placeholder="e.g. support@theonetrade.in" />
            <TextareaField label="Disclaimer" value={content.footer?.disclaimer} onChange={(v) => updateField('footer', 'disclaimer', v)} placeholder="Legal disclaimer text" rows={4} />

            <h4 className="font-semibold text-gray-700 mt-4 border-b pb-2">Quick Links</h4>
            {(content.footer?.quickLinks || []).map((link: any, i: number) => (
              <div key={i} className={`flex gap-3 items-center transition-opacity ${link._disabled ? 'opacity-40' : ''}`}>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Label</label>
                  <input
                    type="text"
                    value={link.label || ''}
                    disabled={link._disabled}
                    onChange={(e) => {
                      const links = [...(content.footer?.quickLinks || [])];
                      links[i] = { ...links[i], label: e.target.value };
                      updateField('footer', 'quickLinks', links);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                    placeholder="e.g. Login"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">URL</label>
                  <input
                    type="text"
                    value={link.url || ''}
                    disabled={link._disabled}
                    onChange={(e) => {
                      const links = [...(content.footer?.quickLinks || [])];
                      links[i] = { ...links[i], url: e.target.value };
                      updateField('footer', 'quickLinks', links);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                    placeholder="e.g. /login"
                  />
                </div>
                <ToggleSwitch
                  enabled={!link._disabled}
                  onToggle={() => {
                    const links = [...(content.footer?.quickLinks || [])];
                    links[i] = { ...links[i], _disabled: !link._disabled };
                    updateField('footer', 'quickLinks', links);
                  }}
                />
              </div>
            ))}
            <button
              onClick={() => {
                const links = [...(content.footer?.quickLinks || []), { label: '', url: '' }];
                updateField('footer', 'quickLinks', links);
              }}
              className="text-sm text-brand-emerald hover:underline"
            >
              + Add Quick Link
            </button>

            <h4 className="font-semibold text-gray-700 mt-4 border-b pb-2">Social Media Links</h4>
            {(content.footer?.socialLinks || []).map((link: any, i: number) => (
              <div key={i} className={`flex gap-3 items-center transition-opacity ${link._disabled ? 'opacity-40' : ''}`}>
                <div className="w-10 h-10 flex items-center justify-center text-gray-500 flex-shrink-0">
                  {link.platform && SOCIAL_ICONS[link.platform] ? SOCIAL_ICONS[link.platform] : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>
                  )}
                </div>
                <div className="w-40">
                  <label className="block text-xs text-gray-500 mb-1">Platform</label>
                  <select
                    value={link.platform || ''}
                    disabled={link._disabled}
                    onChange={(e) => {
                      const links = [...(content.footer?.socialLinks || [])];
                      links[i] = { ...links[i], platform: e.target.value };
                      updateField('footer', 'socialLinks', links);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                  >
                    <option value="">Select platform</option>
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">URL</label>
                  <input
                    type="text"
                    value={link.url || ''}
                    disabled={link._disabled}
                    onChange={(e) => {
                      const links = [...(content.footer?.socialLinks || [])];
                      links[i] = { ...links[i], url: e.target.value };
                      updateField('footer', 'socialLinks', links);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                    placeholder="e.g. https://instagram.com/theonetrade"
                  />
                </div>
                <ToggleSwitch
                  enabled={!link._disabled}
                  onToggle={() => {
                    const links = [...(content.footer?.socialLinks || [])];
                    links[i] = { ...links[i], _disabled: !link._disabled };
                    updateField('footer', 'socialLinks', links);
                  }}
                />
              </div>
            ))}
            <button
              onClick={() => {
                const links = [...(content.footer?.socialLinks || []), { platform: '', url: '' }];
                updateField('footer', 'socialLinks', links);
              }}
              className="text-sm text-brand-emerald hover:underline"
            >
              + Add Social Link
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
