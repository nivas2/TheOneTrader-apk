'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { SEGMENT_LABELS, PLAN_TYPE_LABELS } from '@/lib/labels';

const SEGMENT_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'INTRADAY', label: 'Intraday' },
  { key: 'FANDO', label: 'F&O' },
  { key: 'MTF', label: 'MTF' },
  { key: 'LONGTERM', label: 'Long Term' },
  { key: 'SHORTTERM', label: 'Short Term' },
];

export default function PricingSection() {
  const [plans, setPlans] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.get('/public/plans/public')
      .then((res) => setPlans(res.data.data || []))
      .catch(() => {});
  }, []);

  if (plans.length === 0) return null;

  const filteredPlans = filter === 'ALL' ? plans : plans.filter((p) => p.segment === filter);

  return (
    <section className="py-20 bg-brand-gray">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-3 scroll-reveal">Choose Your Plan</h2>
        <p className="text-center text-text-body mb-10 scroll-reveal">
          Pick the plan that fits your trading style and budget
        </p>

        {/* Segment Filter Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide justify-start sm:justify-center gap-2 mb-10 pb-1">
          {SEGMENT_FILTERS.map((seg) => (
            <button
              key={seg.key}
              onClick={() => setFilter(seg.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                filter === seg.key
                  ? 'bg-brand-emerald text-white'
                  : 'bg-white text-text-body border border-gray-200 hover:border-brand-emerald hover:text-brand-emerald'
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan._id}
              className="card relative group hover:shadow-lg hover:border-brand-emerald/20 transition-all flex flex-col"
            >
              {/* Segment Badge */}
              <span className="inline-block self-start px-3 py-1 rounded-full text-xs font-medium bg-brand-emerald/10 text-brand-emerald mb-4">
                {SEGMENT_LABELS[plan.segment] || plan.segment}
              </span>

              <h3 className="text-xl font-bold text-text-heading mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-400 mb-4">
                {PLAN_TYPE_LABELS[plan.planType] || plan.planType} &middot; {plan.durationDays} days
              </p>

              <div className="mb-6">
                <span className="text-3xl font-bold text-text-heading">
                  {plan.currency === 'INR' ? '₹' : '$'}{plan.price.toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-gray-400 ml-1">
                  / {plan.durationDays} days
                </span>
              </div>

              {/* Features */}
              {plan.features && plan.features.length > 0 && (
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-body">
                      <svg className="w-4 h-4 text-brand-emerald mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/register"
                className="block text-center px-6 py-3 bg-brand-emerald text-white rounded-lg font-medium hover:opacity-90 transition-opacity mt-auto"
              >
                Subscribe Now
              </Link>
            </div>
          ))}
        </div>

        {filteredPlans.length === 0 && (
          <p className="text-center text-gray-400 py-8">No plans available for this segment</p>
        )}
      </div>
    </section>
  );
}
