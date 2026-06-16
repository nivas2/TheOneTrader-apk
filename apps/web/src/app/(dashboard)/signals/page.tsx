'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import SignalCard from '@/components/SignalCard';
import { useSignalSocket } from '@/hooks/useSocket';

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
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
        const active = subs.some((s: any) => s.status === 'ACTIVE');
        setHasActiveSubscription(active);
      })
      .catch(() => setHasActiveSubscription(false));
  }, []);

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

  const isNonSubscriber = hasActiveSubscription === false;

  return (
    <div>
      {/* FOMO Banner for non-subscribers */}
      {isNonSubscriber && (
        <div className="mb-6 bg-gradient-to-r from-brand-emerald to-emerald-600 rounded-xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-white/90">Live signals are being sent right now</span>
            </div>
            <h3 className="text-xl font-bold mb-1">You're missing out on profitable trades!</h3>
            <p className="text-white/80 text-sm mb-4">
              Our subscribers are receiving real-time trading signals with entry, target & stop loss levels.
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
