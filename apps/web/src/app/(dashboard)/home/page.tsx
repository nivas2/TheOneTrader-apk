'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import CountdownTimer from '@/components/CountdownTimer';
import LeadCaptureModal from '@/components/LeadCaptureModal';
import Link from 'next/link';
import { SEGMENT_LABELS, PLAN_TYPE_LABELS } from '@/lib/labels';

export default function DashboardHome() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSignalCount, setActiveSignalCount] = useState(0);

  useEffect(() => {
    api.get('/client/subscriptions/mine').then((res) => setSubscriptions(res.data.data || [])).catch(() => {});
    api.get('/signals/active').then((res) => setActiveSignalCount(res.data.data?.length || 0)).catch(() => {});
  }, []);

  const activeSub = subscriptions.find((s: any) => s.status === 'ACTIVE' || s.status === 'PENDING_ACTIVATION');

  return (
    <div className="space-y-6">
      <LeadCaptureModal delay={5000} sessionKey="dashboardLeadModalSeen" />

      {/* Subscription Status */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Subscription Status</h2>
        {activeSub ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Active Plan</p>
              <p className="text-lg font-semibold">
                {PLAN_TYPE_LABELS[activeSub.planType] || activeSub.planType} - {SEGMENT_LABELS[activeSub.segment] || activeSub.segment}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Expires: {new Date(activeSub.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <CountdownTimer expiresAt={activeSub.expiresAt} />
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-text-body mb-4">No active subscription</p>
            <Link href="/payment" className="btn-primary">Subscribe Now</Link>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-emerald">{activeSignalCount}</p>
          <p className="text-sm text-text-body mt-1">Active Signals</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-text-heading">{subscriptions.length}</p>
          <p className="text-sm text-text-body mt-1">Total Subscriptions</p>
        </div>
        <div className="card text-center">
          <Link href="/signals" className="btn-primary inline-block">View Signals</Link>
        </div>
      </div>
    </div>
  );
}
