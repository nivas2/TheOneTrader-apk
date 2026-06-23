'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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

function DynamicList({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const newItems = [...items];
              newItems[i] = e.target.value;
              onChange(newItems);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
          />
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm"
          >
            Remove
          </button>
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

  const saveSection = async (sectionKey: string) => {
    setSavingSection(sectionKey);
    try {
      const payload: any = {};
      payload[sectionKey] = content[sectionKey];
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
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Preview Landing Page
        </a>
      </div>

      <div className="space-y-4">
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
            <InputField label="Profit Label" value={content.hero?.profitLabel} onChange={(v) => updateField('hero', 'profitLabel', v)} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Primary CTA Text" value={content.hero?.ctaPrimaryText} onChange={(v) => updateField('hero', 'ctaPrimaryText', v)} />
              <InputField label="Primary CTA Link" value={content.hero?.ctaPrimaryLink} onChange={(v) => updateField('hero', 'ctaPrimaryLink', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Secondary CTA Text" value={content.hero?.ctaSecondaryText} onChange={(v) => updateField('hero', 'ctaSecondaryText', v)} />
              <InputField label="Secondary CTA Link" value={content.hero?.ctaSecondaryLink} onChange={(v) => updateField('hero', 'ctaSecondaryLink', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Online Traders Suffix" value={content.hero?.onlineTradersSuffix} onChange={(v) => updateField('hero', 'onlineTradersSuffix', v)} />
              <InputField label="Joined Today Text" value={content.hero?.joinedTodayText} onChange={(v) => updateField('hero', 'joinedTodayText', v)} />
            </div>
          </div>
        </Section>

        {/* Mock Trade Card */}
        <Section
          title="Mock Trade Card"
          isOpen={!!openSections.mockTradeCard}
          onToggle={() => toggleSection('mockTradeCard')}
          onSave={() => saveSection('mockTradeCard')}
          saving={savingSection === 'mockTradeCard'}
        >
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Action (BUY/SELL)" value={content.mockTradeCard?.action} onChange={(v) => updateField('mockTradeCard', 'action', v)} />
              <InputField label="Instrument" value={content.mockTradeCard?.instrument} onChange={(v) => updateField('mockTradeCard', 'instrument', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Segment" value={content.mockTradeCard?.segment} onChange={(v) => updateField('mockTradeCard', 'segment', v)} />
              <InputField label="Category" value={content.mockTradeCard?.category} onChange={(v) => updateField('mockTradeCard', 'category', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Entry Min" value={content.mockTradeCard?.entryMin} onChange={(v) => updateField('mockTradeCard', 'entryMin', v)} />
              <InputField label="Entry Max" value={content.mockTradeCard?.entryMax} onChange={(v) => updateField('mockTradeCard', 'entryMax', v)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="Target" value={content.mockTradeCard?.target} onChange={(v) => updateField('mockTradeCard', 'target', v)} />
              <InputField label="Stop Loss" value={content.mockTradeCard?.stopLoss} onChange={(v) => updateField('mockTradeCard', 'stopLoss', v)} />
              <InputField label="P&L" value={content.mockTradeCard?.pnl} onChange={(v) => updateField('mockTradeCard', 'pnl', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Status Label" value={content.mockTradeCard?.statusLabel} onChange={(v) => updateField('mockTradeCard', 'statusLabel', v)} />
              <InputField label="Badge Label" value={content.mockTradeCard?.badgeLabel} onChange={(v) => updateField('mockTradeCard', 'badgeLabel', v)} />
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
              <div key={i} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Value</label>
                  <input
                    type="text"
                    value={item.value || ''}
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
                    onChange={(e) => {
                      const arr = [...content.socialProof];
                      arr[i] = { ...arr[i], label: e.target.value };
                      setContent((prev: any) => ({ ...prev, socialProof: arr }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                  />
                </div>
                <button
                  onClick={() => {
                    const arr = content.socialProof.filter((_: any, idx: number) => idx !== i);
                    setContent((prev: any) => ({ ...prev, socialProof: arr }));
                  }}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm"
                >
                  Remove
                </button>
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
              <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700">Segment #{i + 1}: {seg.title}</span>
                  <button
                    onClick={() => {
                      const segs = content.whatWeOffer.segments.filter((_: any, idx: number) => idx !== i);
                      updateField('whatWeOffer', 'segments', segs);
                    }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Remove
                  </button>
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
            <InputField label="CTA Button Text" value={content.whatWeOffer?.allSegmentsCTA?.buttonText} onChange={(v) => updateNestedField('whatWeOffer', 'allSegmentsCTA', 'buttonText', v)} />
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
              <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700">Step #{i + 1}</span>
                  <button
                    onClick={() => {
                      const steps = content.howItWorks.steps.filter((_: any, idx: number) => idx !== i);
                      updateField('howItWorks', 'steps', steps);
                    }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Remove
                  </button>
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

        {/* Signal Preview */}
        <Section
          title="Signal Preview Section"
          isOpen={!!openSections.signalPreview}
          onToggle={() => toggleSection('signalPreview')}
          onSave={() => saveSection('signalPreview')}
          saving={savingSection === 'signalPreview'}
        >
          <div className="grid gap-4">
            <InputField label="Badge Text" value={content.signalPreview?.badgeText} onChange={(v) => updateField('signalPreview', 'badgeText', v)} />
            <InputField label="Heading" value={content.signalPreview?.heading} onChange={(v) => updateField('signalPreview', 'heading', v)} />
            <InputField label="Subheading" value={content.signalPreview?.subheading} onChange={(v) => updateField('signalPreview', 'subheading', v)} />
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
      </div>
    </div>
  );
}
