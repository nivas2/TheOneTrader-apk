'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { SEGMENT_LABELS, SUBCATEGORY_LABELS } from '@/lib/labels';
import MarqueeBanner from '@/components/MarqueeBanner';
import LeadCaptureModal from '@/components/LeadCaptureModal';
import TestimonialCarousel from '@/components/TestimonialCarousel';

// ── Custom Hooks ──

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe after a short delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('.scroll-reveal');
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  });
}

function useCountUp(target: number, duration: number, startCounting: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startCounting || target === 0) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, startCounting]);
  return count;
}

// ── FOMO Data ──

const FOMO_NAMES = [
  'Rahul M.', 'Priya S.', 'Amit K.', 'Sneha R.', 'Vikram P.',
  'Ananya D.', 'Rohan G.', 'Kavita N.', 'Arjun B.', 'Meera T.',
  'Suresh L.', 'Divya C.', 'Karan J.', 'Neha W.', 'Raj V.',
];

const FOMO_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

const TYPEWRITER_PHRASES = [
  'Expert-curated signals delivered instantly.',
  '85%+ win rate across all segments.',
  'Join 2,500+ profitable Indian traders.',
];

// ── Component ──

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [signals, setSignals] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [isApp, setIsApp] = useState(false);

  // FOMO
  const [profitCounter, setProfitCounter] = useState(1247350);
  const [onlineTraders, setOnlineTraders] = useState(47);
  const [fomoToast, setFomoToast] = useState<{ name: string; city: string; visible: boolean } | null>(null);

  // Countdown
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Typewriter
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterIndex, setTypewriterIndex] = useState(0);

  // Stats
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useScrollReveal();

  const winRate = useCountUp(performance?.winRate || 0, 1500, statsVisible);
  const totalSignals = useCountUp(performance?.total || 0, 1500, statsVisible);
  const hitTarget = useCountUp(performance?.hitTarget || 0, 1500, statsVisible);
  const hitSL = useCountUp(performance?.hitSL || 0, 1500, statsVisible);

  // Detect WebView and redirect
  useEffect(() => {
    const inApp = navigator.userAgent.includes('TheOneTradeApp');
    setIsApp(inApp);
    if (inApp) {
      router.replace(user ? '/signals' : '/login');
    }
  }, [user, router]);

  // Load data
  useEffect(() => {
    if (!isApp) {
      api.get('/signals?limit=6').then((res) => setSignals(res.data.data || [])).catch(() => {});
      api.get('/public/signals/performance').then((res) => setPerformance(res.data.data)).catch(() => {});
    }
  }, [isApp]);

  useEffect(() => {
    if (!statsRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [performance]);

  // Profit counter ticker
  useEffect(() => {
    const tick = () => {
      setProfitCounter((prev) => prev + Math.floor(Math.random() * 451) + 50);
      timeout = setTimeout(tick, Math.floor(Math.random() * 4000) + 3000);
    };
    let timeout = setTimeout(tick, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Online traders
  useEffect(() => {
    const fluctuate = () => {
      setOnlineTraders(Math.floor(Math.random() * 11) + 45);
      timeout = setTimeout(fluctuate, Math.floor(Math.random() * 10000) + 10000);
    };
    let timeout = setTimeout(fluctuate, 10000);
    return () => clearTimeout(timeout);
  }, []);

  // Countdown
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };
    setCountdown(calc());
    const interval = setInterval(() => setCountdown(calc()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Typewriter
  useEffect(() => {
    const phrase = TYPEWRITER_PHRASES[typewriterIndex];
    let charIndex = 0;
    let isDeleting = false;
    const type = () => {
      if (!isDeleting) {
        setTypewriterText(phrase.substring(0, charIndex + 1));
        charIndex++;
        if (charIndex === phrase.length) { isDeleting = true; timeout = setTimeout(type, 2000); return; }
        timeout = setTimeout(type, 50);
      } else {
        setTypewriterText(phrase.substring(0, charIndex - 1));
        charIndex--;
        if (charIndex === 0) { isDeleting = false; setTypewriterIndex((prev) => (prev + 1) % TYPEWRITER_PHRASES.length); return; }
        timeout = setTimeout(type, 30);
      }
    };
    let timeout = setTimeout(type, 500);
    return () => clearTimeout(timeout);
  }, [typewriterIndex]);

  // FOMO toast
  useEffect(() => {
    const showToast = () => {
      const name = FOMO_NAMES[Math.floor(Math.random() * FOMO_NAMES.length)];
      const city = FOMO_CITIES[Math.floor(Math.random() * FOMO_CITIES.length)];
      setFomoToast({ name, city, visible: true });
      setTimeout(() => {
        setFomoToast((prev) => prev ? { ...prev, visible: false } : null);
        setTimeout(() => {
          setFomoToast(null);
          timeout = setTimeout(showToast, Math.floor(Math.random() * 7000) + 8000);
        }, 500);
      }, 4000);
    };
    let timeout = setTimeout(showToast, 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (isApp) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const formatINR = (num: number) => num.toLocaleString('en-IN');

  return (
    <>
      <MarqueeBanner />
      <LeadCaptureModal showEveryVisit />

      {/* ── Hero Section ── */}
      <section className="relative bg-gradient-to-br from-white via-emerald-50/30 to-white overflow-hidden py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-emerald/20 bg-brand-emerald/5 mb-6">
                <span className="w-2 h-2 rounded-full bg-brand-emerald animate-live-dot" />
                <span className="text-sm text-brand-emerald font-medium">2,500+ Indian Traders Trust Us</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-heading leading-tight mb-6">
                Stop Guessing.{' '}
                <span className="text-brand-emerald">Start Profiting.</span>
              </h1>

              <p className="text-lg text-text-body mb-8 h-7">
                {typewriterText}
                <span className="animate-pulse text-brand-emerald">|</span>
              </p>

              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-1">Total Profit Generated</p>
                <p className="text-3xl sm:text-4xl font-bold text-brand-emerald">
                  ₹{formatINR(profitCounter)}+
                </p>
              </div>

              <div className="flex flex-wrap gap-4 mb-8">
                <Link
                  href="/register"
                  className="inline-flex items-center px-8 py-4 bg-brand-emerald text-white rounded-lg font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-emerald/20"
                >
                  Start Trading Now
                  <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/signals"
                  className="inline-flex items-center px-8 py-4 border-2 border-gray-200 text-text-body rounded-lg font-semibold text-lg hover:border-brand-emerald hover:text-brand-emerald transition-colors"
                >
                  View Live Signals
                </Link>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-emerald animate-live-dot" />
                  {onlineTraders} traders online now
                </span>
                <span className="text-gray-300">·</span>
                <span>12 joined today</span>
              </div>
            </div>

            {/* Mock trade card */}
            <div className="hidden lg:flex justify-center">
              <div className="animate-float bg-white border border-gray-100 rounded-2xl p-6 w-80 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-signal-green text-white">BUY</span>
                  <span className="text-xs text-gray-400">Live Signal</span>
                </div>
                <h3 className="text-xl font-bold text-text-heading mb-1">RELIANCE</h3>
                <p className="text-sm text-gray-400 mb-4">Intraday · Equity</p>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-gray-400">Entry</p>
                    <p className="font-semibold text-text-heading">₹2,540 - ₹2,555</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Target</p>
                    <p className="font-semibold text-signal-green">₹2,620</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Stop Loss</p>
                    <p className="font-semibold text-signal-red">₹2,510</p>
                  </div>
                  <div>
                    <p className="text-gray-400">P&L</p>
                    <p className="font-semibold text-signal-green">+24.8%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-signal-green animate-live-dot" />
                  <span className="text-xs text-signal-green font-medium">Target Hit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Bar ── */}
      <section className="bg-white border-y border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            {[
              { value: '2,500+', label: 'Active Traders' },
              { value: '85%+', label: 'Win Rate' },
              { value: '4.8/5', label: 'Rating' },
              { value: '3 Years', label: 'Track Record' },
              { value: '24/7', label: 'Support' },
            ].map((item, i) => (
              <div key={i} className="scroll-reveal scroll-delay-1">
                <p className="text-2xl font-bold text-text-heading">{item.value}</p>
                <p className="text-sm text-text-body">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What We Offer — Segment Categories ── */}
      <section className="py-20 bg-brand-gray">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-text-heading mb-3 scroll-reveal">What We Offer</h2>
          <p className="text-center text-text-body mb-14 scroll-reveal">
            Expert signals across every market segment — pick your trading style, we deliver the profits
          </p>

          {/* Intraday */}
          <div id="intraday" className="scroll-reveal mb-10 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-gradient-to-br from-brand-emerald to-emerald-600 p-8 flex flex-col justify-center text-white">
                <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <h3 className="text-2xl font-bold mb-2">Intraday Trading</h3>
                <p className="text-white/80">Fast-paced, same-day trades for daily profits</p>
              </div>
              <div className="md:w-2/3 p-8">
                <p className="text-text-body mb-5">
                  Our intraday signals are designed for traders who want to capitalize on daily market movements. Every signal comes with precise entry price, target, and stop loss — so you know exactly when to get in and when to get out. No guesswork, no overnight risk.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Same-day buy & sell signals with clear entry/exit',
                    'Tight stop losses for capital protection',
                    '2-5 high-conviction signals daily during market hours',
                    'Covers NSE & BSE equities with real-time alerts',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-brand-emerald mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-text-body">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* F&O */}
          <div id="fno" className="scroll-reveal mb-10 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="md:flex md:flex-row-reverse">
              <div className="md:w-1/3 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 flex flex-col justify-center text-white">
                <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-2xl font-bold mb-2">Futures &amp; Options</h3>
                <p className="text-white/80">Leverage derivatives for amplified returns</p>
              </div>
              <div className="md:w-2/3 p-8">
                <p className="text-text-body mb-5">
                  Trade Nifty, Bank Nifty, and stock options with confidence. Our F&amp;O signals are backed by deep technical analysis, option chain data, and open interest tracking. Each call includes the exact strike price, premium range, and predefined risk levels.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Nifty, Bank Nifty & stock option calls',
                    'Clear strike price, premium entry & exit levels',
                    'High reward-to-risk ratio setups',
                    'Hedging strategies & spread recommendations',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-text-body">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* MTF */}
          <div id="mtf" className="scroll-reveal mb-10 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-gradient-to-br from-amber-500 to-orange-600 p-8 flex flex-col justify-center text-white">
                <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-2xl font-bold mb-2">MTF (Margin Trading)</h3>
                <p className="text-white/80">Maximize capital efficiency with leverage</p>
              </div>
              <div className="md:w-2/3 p-8">
                <p className="text-text-body mb-5">
                  Margin Trading Facility signals help you take larger positions with smaller capital. We identify high-conviction stocks suitable for margin-backed trades with strict risk management — so you can amplify gains without reckless exposure.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Carefully selected margin-worthy stocks',
                    'Risk-managed position sizing guidance',
                    'Multi-day holding with clear targets & SL',
                    'Ideal for traders with limited capital wanting bigger exposure',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-text-body">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Long Term */}
          <div id="longterm" className="scroll-reveal mb-10 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="md:flex md:flex-row-reverse">
              <div className="md:w-1/3 bg-gradient-to-br from-purple-600 to-violet-700 p-8 flex flex-col justify-center text-white">
                <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <h3 className="text-2xl font-bold mb-2">Long Term Investment</h3>
                <p className="text-white/80">Build lasting wealth with quality stocks</p>
              </div>
              <div className="md:w-2/3 p-8">
                <p className="text-text-body mb-5">
                  For investors who think beyond daily charts. Our long-term picks are backed by fundamental research — revenue growth, earnings quality, competitive moats, and management track record. Build a portfolio that compounds wealth over months and years.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Fundamental + technical analysis combined',
                    'Portfolio-grade quality stocks with strong moats',
                    'Ideal for SIP-style accumulation and wealth building',
                    'Quarterly reviews with updated targets',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-text-body">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Short Term */}
          <div id="shortterm" className="scroll-reveal mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-gradient-to-br from-teal-500 to-cyan-600 p-8 flex flex-col justify-center text-white">
                <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-2xl font-bold mb-2">Short Term Investment</h3>
                <p className="text-white/80">Swing trades for steady, consistent returns</p>
              </div>
              <div className="md:w-2/3 p-8">
                <p className="text-text-body mb-5">
                  Perfect for working professionals who can&apos;t watch the market all day. Our short-term swing trade signals have a 1-4 week holding period, capturing medium-term trends and breakout moves. Set your orders and let the market work for you.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    '1-4 week holding period for comfortable execution',
                    'Trend & breakout based high-probability entries',
                    'Perfect for salaried professionals and part-time traders',
                    'Weekly portfolio updates with hold/exit guidance',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-text-body">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* All segments CTA */}
          <div className="scroll-reveal text-center mt-10">
            <div className="inline-block bg-white rounded-2xl shadow-sm border border-gray-100 px-10 py-8">
              <h3 className="text-xl font-bold text-text-heading mb-2">All 5 Segments. One Subscription.</h3>
              <p className="text-text-body mb-5">Get signals across Intraday, F&amp;O, MTF, Long Term &amp; Short Term — no hidden charges.</p>
              <Link href="/register" className="btn-primary text-lg px-8 py-3">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Performance Stats ── */}
      {performance && (
        <section className="py-20 bg-white" ref={statsRef}>
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-3 scroll-reveal">Our Track Record</h2>
            <p className="text-center text-text-body mb-12 scroll-reveal">Verified performance across all market segments</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: `${winRate}%`, label: 'Win Rate', color: 'text-brand-emerald' },
                { value: totalSignals, label: 'Total Signals', color: 'text-text-heading' },
                { value: hitTarget, label: 'Targets Hit', color: 'text-signal-green' },
                { value: hitSL, label: 'Stop Loss Hit', color: 'text-signal-red' },
              ].map((stat, i) => (
                <div key={i} className={`scroll-reveal scroll-delay-${i + 1} card text-center`}>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-text-body text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How It Works ── */}
      <section className="py-20 bg-brand-gray">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3 scroll-reveal">How It Works</h2>
          <p className="text-center text-text-body mb-12 scroll-reveal">Start profiting in 3 simple steps</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01', title: 'Sign Up',
                desc: 'Create your free account in under 60 seconds. No credit card required.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
              },
              {
                step: '02', title: 'Get Signals',
                desc: 'Receive expert-curated buy/sell signals with entry, target, and stop loss levels.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
              },
              {
                step: '03', title: 'Book Profits',
                desc: 'Execute trades based on our signals and watch your portfolio grow consistently.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
              },
            ].map((item, i) => (
              <div key={i} className={`scroll-reveal scroll-delay-${i + 1} card relative group hover:shadow-lg hover:border-brand-emerald/20 transition-all`}>
                <span className="absolute top-4 right-4 text-5xl font-bold text-brand-emerald/10 group-hover:text-brand-emerald/20 transition-colors">
                  {item.step}
                </span>
                <div className="w-14 h-14 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-5">
                  <svg className="w-8 h-8 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">{item.icon}</svg>
                </div>
                <h3 className="text-xl font-bold text-text-heading mb-2">{item.title}</h3>
                <p className="text-text-body">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Signal Preview Grid ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 scroll-reveal">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 mb-4">
              Limited Time: First 3 signals free
            </span>
            <h2 className="text-3xl font-bold mb-3">Latest Trading Signals</h2>
            <p className="text-text-body">Subscribe to unlock full signal details</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.map((signal, i) => {
              const isBuy = signal.action === 'BUY';
              const isPremiumLocked = signal.requiresPremium;
              return (
                <div
                  key={signal._id}
                  className={`scroll-reveal scroll-delay-${(i % 4) + 1} card relative ${
                    signal.status === 'ACTIVE' ? (isBuy ? 'border-l-4 border-l-signal-green' : 'border-l-4 border-l-signal-red') : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${isBuy ? 'bg-signal-green text-white' : 'bg-signal-red text-white'}`}>
                        {signal.action}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {SEGMENT_LABELS[signal.segment] || signal.segment}
                      </span>
                    </div>
                  </div>
                  <h3 className={`text-lg font-bold mb-3 ${isPremiumLocked ? 'blur-sm select-none' : ''}`}>
                    {signal.instrument}
                  </h3>
                  <div className={`grid grid-cols-2 gap-3 text-sm ${isPremiumLocked ? 'blur-sm select-none' : ''}`}>
                    <div>
                      <p className="text-gray-500">Entry</p>
                      <p className="font-semibold">{signal.entryPriceRange?.min} - {signal.entryPriceRange?.max}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Target</p>
                      <p className="font-semibold text-signal-green">{signal.targetPrice}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Stop Loss</p>
                      <p className="font-semibold text-signal-red">{signal.stopLoss}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-semibold">{SUBCATEGORY_LABELS[signal.subCategory] || signal.subCategory}</p>
                    </div>
                  </div>
                  {isPremiumLocked && (
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto text-brand-emerald mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <p className="font-semibold text-text-heading">Premium Signal</p>
                        <Link href="/payment" className="text-sm text-brand-emerald hover:underline">Unlock Now</Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {signals.length === 0 && (
            <p className="text-center text-gray-400 py-8">No signals available yet</p>
          )}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <TestimonialCarousel />

      {/* ── Countdown / Urgency ── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 scroll-reveal">
            Only <span className="text-brand-emerald">23 Spots</span> Left This Month
          </h2>
          <p className="text-text-body mb-10 scroll-reveal">Offer expires at end of month. Don&apos;t miss out.</p>

          <div className="flex justify-center gap-4 mb-10 scroll-reveal">
            {[
              { value: countdown.days, label: 'Days' },
              { value: countdown.hours, label: 'Hours' },
              { value: countdown.minutes, label: 'Minutes' },
              { value: countdown.seconds, label: 'Seconds' },
            ].map((item, i) => (
              <div key={i} className="bg-brand-gray border border-gray-200 rounded-xl p-4 w-20 sm:w-24">
                <p className="text-2xl sm:text-3xl font-bold text-text-heading">{String(item.value).padStart(2, '0')}</p>
                <p className="text-xs text-text-body mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <Link
            href="/register"
            className="inline-flex items-center px-8 py-4 bg-brand-emerald text-white rounded-lg font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-emerald/20 scroll-reveal"
          >
            Claim Your Spot
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 bg-brand-emerald text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 scroll-reveal">Your Next Profitable Trade is Waiting</h2>
          <p className="text-lg opacity-90 mb-8 scroll-reveal">
            Join thousands of traders who trust TheOneTrade for accurate, timely signals.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-6 scroll-reveal">
            <Link href="/register" className="inline-block bg-white text-brand-emerald px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors">
              Get Started Now
            </Link>
            <Link href="/signals" className="inline-block border-2 border-white/40 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors">
              View Signals
            </Link>
          </div>
          <p className="text-sm opacity-70 scroll-reveal">No credit card required · Cancel anytime · Instant access</p>
        </div>
      </section>

      {/* ── FOMO Toast ── */}
      {fomoToast && (
        <div
          className={`fixed bottom-6 left-6 z-50 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-xl max-w-xs ${
            fomoToast.visible ? 'animate-toast-in' : 'animate-toast-out'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-emerald/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-heading font-medium">
                {fomoToast.name} from {fomoToast.city}
              </p>
              <p className="text-xs text-gray-400">just joined · {Math.floor(Math.random() * 5) + 1} min ago</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
