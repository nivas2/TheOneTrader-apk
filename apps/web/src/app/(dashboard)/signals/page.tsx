'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import SignalCard from '@/components/SignalCard';
import { useSignalSocket } from '@/hooks/useSocket';

interface SubState {
  hasActive: boolean;
  isPendingApproval: boolean;
  isPendingActivation: boolean;
  isRejected: boolean;
  isExpired: boolean;
  isNewUser: boolean;
  activationDate: string | null;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  rejectionReason: string | null;
}

function getISTGreeting(): string {
  const now = new Date();
  const istHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
  if (istHour >= 7 && istHour < 12) return 'Good Morning';
  if (istHour >= 12 && istHour < 16) return 'Good Afternoon';
  if (istHour >= 16 && istHour < 22) return 'Good Evening';
  return 'Welcome back';
}

function buildSubState(subs: any[]): SubState {
  const state: SubState = {
    hasActive: false,
    isPendingApproval: false,
    isPendingActivation: false,
    isRejected: false,
    isExpired: false,
    isNewUser: subs.length === 0,
    activationDate: null,
    expiresAt: null,
    daysUntilExpiry: null,
    rejectionReason: null,
  };

  // Check for active subscription first (always takes priority)
  for (const s of subs) {
    if (s.status === 'ACTIVE') {
      state.hasActive = true;
      if (s.expiresAt) {
        state.expiresAt = s.expiresAt;
        const diffMs = new Date(s.expiresAt).getTime() - Date.now();
        state.daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
    }
  }

  // If active, no need to determine other banner statuses
  if (state.hasActive) return state;

  // Sort by updatedAt desc — only show the LATEST subscription's banner
  const sorted = [...subs].sort((a, b) =>
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  const latest = sorted[0];
  if (latest) {
    switch (latest.status) {
      case 'PENDING_APPROVAL':
        state.isPendingApproval = true;
        break;
      case 'PENDING_ACTIVATION':
        state.isPendingActivation = true;
        if (latest.activatedAt) state.activationDate = latest.activatedAt;
        break;
      case 'REJECTED':
        state.isRejected = true;
        if (latest.rejectionReason) state.rejectionReason = latest.rejectionReason;
        break;
      case 'EXPIRED':
        state.isExpired = true;
        break;
    }
  }

  return state;
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subState, setSubState] = useState<SubState | null>(null);
  const [liveLockedCount, setLiveLockedCount] = useState(0);

  useEffect(() => {
    api.get('/signals/active')
      .then((res) => setSignals(res.data.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));

    // Check subscription status
    api.get('/client/subscriptions/mine')
      .then((res) => {
        const subs = res.data.data || [];
        setSubState(buildSubState(subs));
      })
      .catch(() => setSubState(buildSubState([])));
  }, []);

  const hasActiveSubscription = subState?.hasActive ?? false;

  const onNewSignal = useCallback((data: any) => {
    if (hasActiveSubscription) {
      setSignals((prev) => [data.signal, ...prev]);
    } else {
      setLiveLockedCount((prev) => prev + 1);
    }
  }, [hasActiveSubscription]);

  const onSignalUpdate = useCallback((data: any) => {
    setSignals((prev) =>
      prev.map((s) => (s._id === data.signal._id ? data.signal : s))
        .filter((s) => s.status === 'ACTIVE')
    );
  }, []);

  const { acknowledgeSignal } = useSignalSocket(onNewSignal, onSignalUpdate);

  const handleAcknowledge = (signalId: string) => {
    acknowledgeSignal(signalId);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading signals...</div>;
  }

  const isNonSubscriber = !hasActiveSubscription;
  const greeting = getISTGreeting();

  const formatActivationDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <div>
      {/* Context-aware banners */}
      {subState && (
        <>
          {/* 1. Rejected banner (red) */}
          {subState.isRejected && !subState.hasActive && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-1">Payment Rejected</h3>
                  {subState.rejectionReason && (
                    <p className="text-sm text-red-700 mb-3">
                      Reason: {subState.rejectionReason}
                    </p>
                  )}
                  <Link
                    href="/payment"
                    className="inline-block bg-red-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Try Again
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 2. Active + expiring ≤3 days (yellow) */}
          {subState.hasActive && subState.daysUntilExpiry !== null && subState.daysUntilExpiry <= 3 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 mb-1">
                    Subscription expires in {subState.daysUntilExpiry} day{subState.daysUntilExpiry !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">Renew now to avoid missing out on live signals.</p>
                  <Link
                    href="/payment"
                    className="inline-block bg-yellow-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                  >
                    Renew Now
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 3. Active (green gradient) — only if NOT expiring soon */}
          {subState.hasActive && (subState.daysUntilExpiry === null || subState.daysUntilExpiry > 3) && (
            <div className="mb-4 bg-gradient-to-r from-brand-emerald to-emerald-600 rounded-xl p-5 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-1">{greeting}!</h3>
                <p className="text-white/80 text-sm">Stay focused and follow your trading plan. Your signals are live below.</p>
              </div>
            </div>
          )}

          {/* 4. Pending activation (blue) */}
          {subState.isPendingActivation && !subState.hasActive && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-800 mb-1">Subscription Approved!</h3>
                  <p className="text-sm text-blue-700">
                    Your plan activates on {subState.activationDate ? formatActivationDate(subState.activationDate) : 'soon'} at 12:00 AM IST. You&apos;ll start receiving signals then.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Pending approval (yellow) */}
          {subState.isPendingApproval && !subState.hasActive && !subState.isPendingActivation && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-1">Payment Under Review</h3>
                  <p className="text-sm text-yellow-700">Your payment is being verified. You&apos;ll be notified once approved.</p>
                </div>
              </div>
            </div>
          )}

          {/* 6. Expired (gray) */}
          {subState.isExpired && !subState.hasActive && !subState.isPendingApproval && !subState.isPendingActivation && !subState.isRejected && (
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-700 mb-1">Subscription Expired</h3>
                  <p className="text-sm text-gray-500 mb-3">Renew your subscription to continue receiving live signals.</p>
                  <Link
                    href="/payment"
                    className="inline-block bg-brand-emerald text-white font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm"
                  >
                    Renew Now
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 7. New user (green gradient) */}
          {subState.isNewUser && (
            <div className="mb-4 bg-gradient-to-r from-brand-emerald to-emerald-600 rounded-xl p-5 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-white/90">Live signals are being sent right now</span>
                </div>
                <h3 className="text-xl font-bold mb-1">Subscribe to start receiving signals!</h3>
                <p className="text-white/80 text-sm mb-4">
                  Get real-time trading signals with entry, target & stop loss levels.
                  {liveLockedCount > 0 && (
                    <span className="font-semibold text-white"> {liveLockedCount} new signal{liveLockedCount > 1 ? 's' : ''} sent while you were here!</span>
                  )}
                </p>
                <Link
                  href="/payment"
                  className="inline-block bg-white text-brand-emerald font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Subscribe Now & Start Trading
                </Link>
              </div>
            </div>
          )}

          {/* Trading disclaimer — always visible */}
          <div className="mb-4 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-500">
            Trading involves risk. Past performance does not guarantee future results. Always do your own research before making trading decisions.
          </div>
        </>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Active Signals ({signals.length})</h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-sm text-gray-500">Live</span>
        </div>
      </div>

      {/* Locked signal cards for non-subscribers */}
      {isNonSubscriber && signals.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card relative overflow-hidden border-l-4 border-l-gray-300">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-400">---</span>
                  <span className="text-xs text-gray-300 bg-gray-100 px-2 py-1 rounded">------</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 font-medium">LIVE</span>
                </div>
              </div>
              <div className="blur-sm select-none">
                <h3 className="text-lg font-bold mb-3 text-gray-400">NIFTY 25000 CE</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-400">Entry</span><p className="font-semibold">***.**</p></div>
                  <div><span className="text-gray-400">Target</span><p className="font-semibold text-green-600">***.**</p></div>
                  <div><span className="text-gray-400">Stop Loss</span><p className="font-semibold text-red-600">***.**</p></div>
                </div>
              </div>
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-10 h-10 mx-auto text-brand-emerald mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="font-semibold text-text-heading mb-1">Signal Locked</p>
                  <p className="text-xs text-gray-500 mb-2">Subscribe to view live signals</p>
                  <Link href="/payment" className="text-sm text-brand-emerald font-semibold hover:underline">
                    Unlock Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {signals.length === 0 && !isNonSubscriber ? (
        <div className="card text-center py-12">
          <p className="text-text-body">No active signals right now.</p>
          <p className="text-sm text-gray-400 mt-2">New signals will appear here in real-time.</p>
        </div>
      ) : signals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {signals.map((signal) => (
            <SignalCard
              key={signal._id}
              signal={signal}
              onAcknowledge={handleAcknowledge}
              showAcknowledge
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
