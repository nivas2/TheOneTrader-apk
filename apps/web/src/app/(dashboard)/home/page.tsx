'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import CountdownTimer from '@/components/CountdownTimer';
import LeadCaptureModal from '@/components/LeadCaptureModal';
import Link from 'next/link';
import { SEGMENT_LABELS, PLAN_TYPE_LABELS } from '@/lib/labels';

const SUPPORT_EMAIL = 'hari@theonetrade.in';

export default function DashboardHome() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSignalCount, setActiveSignalCount] = useState(0);

  useEffect(() => {
    api.get('/client/subscriptions/mine').then((res) => setSubscriptions(res.data.data || [])).catch(() => {});
    api.get('/signals/active').then((res) => setActiveSignalCount(res.data.data?.length || 0)).catch(() => {});
  }, []);

  const activeSub = subscriptions.find((s: any) => s.status === 'ACTIVE');
  const pendingActivation = subscriptions.find((s: any) => s.status === 'PENDING_ACTIVATION');
  const pendingApproval = subscriptions.find((s: any) => s.status === 'PENDING_APPROVAL');
  const expiredSub = !activeSub && !pendingActivation && !pendingApproval && subscriptions.find((s: any) => s.status === 'EXPIRED');

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <LeadCaptureModal sessionKey="dashboardLeadModalSeen" />

      {/* Dynamic Subscription Banner */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Subscription Status</h2>

        {activeSub ? (
          /* ACTIVE */
          <div className="border-l-4 border-l-green-500 bg-green-50 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-sm font-semibold text-green-800">Your Plan is Active</p>
                </div>
                <p className="text-lg font-bold text-text-heading">
                  {PLAN_TYPE_LABELS[activeSub.planType] || activeSub.planType} - {SEGMENT_LABELS[activeSub.segment] || activeSub.segment}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Expires: {formatDate(activeSub.expiresAt)}
                </p>
              </div>
              <CountdownTimer expiresAt={activeSub.expiresAt} />
            </div>
          </div>
        ) : pendingActivation ? (
          /* APPROVED — PENDING ACTIVATION */
          <div className="border-l-4 border-l-blue-500 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600 text-lg">&#10003;</span>
              <p className="text-sm font-semibold text-blue-800">Payment Approved!</p>
            </div>
            <p className="text-base font-bold text-text-heading">
              {PLAN_TYPE_LABELS[pendingActivation.planType] || pendingActivation.planType} - {SEGMENT_LABELS[pendingActivation.segment] || pendingActivation.segment}
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Your plan will unlock on <strong>{formatDate(pendingActivation.activatedAt)}</strong> at <strong>12:00 AM</strong>.
              You will start receiving signals from that day.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Validity: {formatDate(pendingActivation.activatedAt)} to {formatDate(pendingActivation.expiresAt)}
            </p>
          </div>
        ) : pendingApproval ? (
          /* PAYMENT SUBMITTED — WAITING FOR ADMIN */
          <div className="border-l-4 border-l-yellow-500 bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-yellow-800">Payment Under Review</p>
            </div>
            <p className="text-base font-bold text-text-heading">
              {PLAN_TYPE_LABELS[pendingApproval.planType] || pendingApproval.planType} - {SEGMENT_LABELS[pendingApproval.segment] || pendingApproval.segment}
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              Your payment has been submitted and is being reviewed by our team.
              Once approved, your plan will activate from the next day at 12:00 AM.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Submitted on {formatDate(pendingApproval.createdAt)}. For queries, contact{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-emerald hover:underline">{SUPPORT_EMAIL}</a>
            </p>
          </div>
        ) : expiredSub ? (
          /* EXPIRED */
          <div className="border-l-4 border-l-gray-400 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-gray-600">Subscription Expired</p>
            </div>
            <p className="text-sm text-gray-500">
              Your {PLAN_TYPE_LABELS[expiredSub.planType] || expiredSub.planType} - {SEGMENT_LABELS[expiredSub.segment] || expiredSub.segment} plan
              expired on {formatDate(expiredSub.expiresAt)}. Renew to continue receiving signals.
            </p>
            <Link href="/payment" className="btn-primary inline-block mt-3">Renew Subscription</Link>
          </div>
        ) : (
          /* NO SUBSCRIPTION */
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-lg font-semibold text-text-heading mb-2">Subscribe & Unlock Premium Signals</p>
            <p className="text-sm text-text-body mb-4">
              Get real-time trading signals with entry, target, and stop loss.
              Once payment is approved, your plan activates from next day 12:00 AM.
            </p>
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
