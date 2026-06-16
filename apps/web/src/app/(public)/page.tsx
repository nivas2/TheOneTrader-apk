'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import MarqueeBanner from '@/components/MarqueeBanner';
import LeadCaptureModal from '@/components/LeadCaptureModal';
import ImageSlider from '@/components/ImageSlider';
import SignalCard from '@/components/SignalCard';
import TestimonialCarousel from '@/components/TestimonialCarousel';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [signals, setSignals] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [banners, setBanners] = useState<string[]>([]);
  const [isApp, setIsApp] = useState<boolean | null>(null);

  // Detect if running inside the APK WebView
  useEffect(() => {
    const isWebView = navigator.userAgent.includes('TheOneTradeApp');
    setIsApp(isWebView);
  }, []);

  // Redirect only when inside the APK
  useEffect(() => {
    if (isApp === null || isLoading) return;
    if (isApp) {
      if (user) {
        router.replace('/signals');
      } else {
        router.replace('/login');
      }
    }
  }, [isApp, user, isLoading, router]);

  // Load landing page data only for website visitors
  useEffect(() => {
    if (isApp === false) {
      api.get('/signals?limit=6').then((res) => setSignals(res.data.data || [])).catch(() => {});
      api.get('/public/signals/performance').then((res) => setPerformance(res.data.data)).catch(() => {});
      api.get('/public/config/public').then((res) => setBanners(res.data.data?.promotionalBanners || [])).catch(() => {});
    }
  }, [isApp]);

  // Show spinner while detecting or redirecting in APK
  if (isApp === null || isApp) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <>
      <MarqueeBanner />
      <LeadCaptureModal showEveryVisit />
      <ImageSlider images={banners} />

      {/* Performance Board */}
      {performance && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-10">Our Track Record</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="card text-center">
                <p className="text-3xl font-bold text-brand-emerald">{performance.winRate}%</p>
                <p className="text-text-body text-sm mt-1">Win Rate</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-text-heading">{performance.total}</p>
                <p className="text-text-body text-sm mt-1">Total Signals</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-signal-green">{performance.hitTarget}</p>
                <p className="text-text-body text-sm mt-1">Targets Hit</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-signal-red">{performance.hitSL}</p>
                <p className="text-text-body text-sm mt-1">Stop Loss Hit</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Signal Preview Grid */}
      <section className="py-16 bg-brand-gray">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3">Latest Trading Signals</h2>
          <p className="text-center text-text-body mb-10">Subscribe to unlock full signal details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.map((signal) => (
              <SignalCard key={signal._id} signal={signal} />
            ))}
          </div>
          {signals.length === 0 && (
            <p className="text-center text-gray-400 py-8">No signals available yet</p>
          )}
        </div>
      </section>

      <TestimonialCarousel />

      {/* CTA Section */}
      <section className="py-16 bg-brand-emerald text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Trade Smarter?</h2>
          <p className="text-lg opacity-90 mb-8">Join thousands of traders who trust TheOneTrade for accurate, timely signals.</p>
          <a href="/register" className="inline-block bg-white text-brand-emerald px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors">
            Get Started Now
          </a>
        </div>
      </section>
    </>
  );
}
