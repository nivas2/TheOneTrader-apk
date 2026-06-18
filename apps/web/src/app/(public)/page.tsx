'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
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

// ── Hero Typewriter Phrases ──

const TYPEWRITER_PHRASES = [
  'Expert-curated signals delivered instantly.',
  '85%+ win rate across all segments.',
  'Join 2,500+ profitable Indian traders.',
];

// ── Component ──

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Data state
  const [signals, setSignals] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [isApp, setIsApp] = useState<boolean | null>(null);

  // FOMO state
  const [profitCounter, setProfitCounter] = useState(1247350);
  const [onlineTraders, setOnlineTraders] = useState(47);
  const [fomoToast, setFomoToast] = useState<{ name: string; city: string; visible: boolean } | null>(null);

  // Countdown
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Typewriter
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterIndex, setTypewriterIndex] = useState(0);

  // Stats visibility
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  // Scroll reveal
  useScrollReveal();

  // Count up animations
  const winRate = useCountUp(performance?.winRate || 0, 1500, statsVisible);
  const totalSignals = useCountUp(performance?.total || 0, 1500, statsVisible);
  const hitTarget = useCountUp(performance?.hitTarget || 0, 1500, statsVisible);
  const hitSL = useCountUp(performance?.hitSL || 0, 1500, statsVisible);

  // Detect WebView
  useEffect(() => {
    const isWebView = navigator.userAgent.includes('TheOneTradeApp');
    setIsApp(isWebView);
  }, []);

  // Redirect in APK
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

  // Load data
  useEffect(() => {
    if (isApp === false) {
      api.get('/signals?limit=6').then((res) => setSignals(res.data.data || [])).catch(() => {});
      api.get('/public/signals/performance').then((res) => setPerformance(res.data.data)).catch(() => {});
    }
  }, [isApp]);

  // Stats intersection observer
  useEffect(() => {
    if (!statsRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [performance]);

  // Profit counter ticker
  useEffect(() => {
    const tick = () => {
      setProfitCounter((prev) => prev + Math.floor(Math.random() * 451) + 50);
      const nextDelay = Math.floor(Math.random() * 4000) + 3000;
      timeout = setTimeout(tick, nextDelay);
    };
    let timeout = setTimeout(tick, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Online traders fluctuation
  useEffect(() => {
    const fluctuate = () => {
      setOnlineTraders(Math.floor(Math.random() * 11) + 45);
      const nextDelay = Math.floor(Math.random() * 10000) + 10000;
      timeout = setTimeout(fluctuate, nextDelay);
    };
    let timeout = setTimeout(fluctuate, 10000);
    return () => clearTimeout(timeout);
  }, []);

  // Countdown timer
  useEffect(() => {
    const calcCountdown = () => {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = endOfMonth.getTime() - now.getTime();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };
    setCountdown(calcCountdown());
    const interval = setInterval(() => setCountdown(calcCountdown()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Typewriter effect
  useEffect(() => {
    const phrase = TYPEWRITER_PHRASES[typewriterIndex];
    let charIndex = 0;
    let isDeleting = false;

    const type = () => {
      if (!isDeleting) {
        setTypewriterText(phrase.substring(0, charIndex + 1));
        charIndex++;
        if (charIndex === phrase.length) {
          isDeleting = true;
          timeout = setTimeout(type, 2000);
          return;
        }
        timeout = setTimeout(type, 50);
      } else {
        setTypewriterText(phrase.substring(0, charIndex - 1));
        charIndex--;
        if (charIndex === 0) {
          isDeleting = false;
          setTypewriterIndex((prev) => (prev + 1) % TYPEWRITER_PHRASES.length);
          return;
        }
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
          const nextDelay = Math.floor(Math.random() * 7000) + 8000;
          timeout = setTimeout(showToast, nextDelay);
        }, 500);
      }, 4000);
    };

    let timeout = setTimeout(showToast, 5000);
    return () => clearTimeout(timeout);
  }, []);

  // Particle positions (stable across renders)
  const [particles] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 20}s`,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.4 + 0.2,
    }))
  );

  // Loading spinner for APK detection
  if (isApp === null || isApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const formatINR = (num: number) => {
    return num.toLocaleString('en-IN');
  };

  return (
    <>
      <MarqueeBanner />
      <LeadCaptureModal showEveryVisit />

      {/* ── S1: Hero Section ── */}
      <section className="relative min-h-screen bg-[#0A0A0F] overflow-hidden flex items-center">
        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_center,rgba(0,176,144,0.15)_0%,transparent_60%)]" />

        {/* Particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-brand-emerald/30 animate-particle"
            style={{
              left: p.left,
              bottom: '-10px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              opacity: p.opacity,
            }}
          />
        ))}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="animate-fade-in-up">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-emerald/30 bg-brand-emerald/5 mb-6">
                <span className="w-2 h-2 rounded-full bg-brand-emerald animate-live-dot" />
                <span className="text-sm text-brand-emerald font-medium">2,500+ Indian Traders Trust Us</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Stop Guessing.{' '}
                <span className="text-brand-emerald">Start Profiting.</span>
              </h1>

              {/* Typewriter subtitle */}
              <p className="text-lg text-gray-400 mb-8 h-7">
                {typewriterText}
                <span className="animate-pulse text-brand-emerald">|</span>
              </p>

              {/* Live profit counter */}
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-1">Total Profit Generated</p>
                <p className="text-3xl sm:text-4xl font-bold text-brand-emerald animate-text-glow">
                  ₹{formatINR(profitCounter)}+
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mb-8">
                <Link
                  href="/register"
                  className="inline-flex items-center px-8 py-4 bg-brand-emerald text-white rounded-lg font-bold text-lg hover:opacity-90 transition-opacity animate-pulse-glow"
                >
                  Start Trading Now
                  <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/signals"
                  className="inline-flex items-center px-8 py-4 border-2 border-white/20 text-gray-300 rounded-lg font-semibold text-lg hover:border-brand-emerald hover:text-brand-emerald transition-colors"
                >
                  View Live Signals
                </Link>
              </div>

              {/* FOMO line */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-emerald animate-live-dot" />
                  {onlineTraders} traders online now
                </span>
                <span className="text-gray-700">·</span>
                <span>12 joined today</span>
              </div>
            </div>

            {/* Right: Mock trade card */}
            <div className="hidden lg:flex justify-center">
              <div className="animate-float bg-[#111118] border border-white/10 rounded-2xl p-6 w-80 shadow-2xl shadow-brand-emerald/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-signal-green text-white">BUY</span>
                  <span className="text-xs text-gray-500">Live Signal</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">RELIANCE</h3>
                <p className="text-sm text-gray-500 mb-4">Intraday · Equity</p>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-gray-500">Entry</p>
                    <p className="font-semibold text-white">₹2,540 - ₹2,555</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Target</p>
                    <p className="font-semibold text-signal-green">₹2,620</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Stop Loss</p>
                    <p className="font-semibold text-signal-red">₹2,510</p>
                  </div>
                  <div>
                    <p className="text-gray-500">P&L</p>
                    <p className="font-semibold text-signal-green">+24.8%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <span className="w-2 h-2 rounded-full bg-signal-green animate-live-dot" />
                  <span className="text-xs text-signal-green">Target Hit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── S2: Social Proof Bar ── */}
      <section className="bg-[#111118] border-y border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            {[
              { icon: '👥', value: '2,500+', label: 'Active Traders' },
              { icon: '📈', value: '85%+', label: 'Win Rate' },
              { icon: '⭐', value: '4.8/5', label: 'Rating' },
              { icon: '🏆', value: '3 Years', label: 'Track Record' },
              { icon: '💬', value: '24/7', label: 'Support' },
            ].map((item, i) => (
              <div key={i} className="scroll-reveal scroll-delay-1">
                <p className="text-2xl mb-1">{item.icon}</p>
                <p className="text-xl font-bold text-white">{item.value}</p>
                <p className="text-sm text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What We Offer — Segment Categories ── */}
      <section className="py-20 bg-[#0A0A0F]">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-3 scroll-reveal">What We Offer</h2>
          <p className="text-center text-gray-500 mb-12 scroll-reveal">
            Expert signals across every market segment — pick your style, we deliver the profits
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Intraday */}
            <div id="intraday" className="scroll-reveal scroll-delay-1 bg-[#111118] border border-white/5 rounded-xl p-7 group hover:border-brand-emerald/20 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Intraday Trading</h3>
              <p className="text-gray-500 mb-4">
                Quick, same-day trades with precise entry and exit levels. Ideal for traders who want daily profits without overnight risk.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Same-day buy &amp; sell signals
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Tight stop losses for capital protection
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  2-5 signals daily during market hours
                </li>
              </ul>
            </div>

            {/* F&O */}
            <div id="fno" className="scroll-reveal scroll-delay-2 bg-[#111118] border border-white/5 rounded-xl p-7 group hover:border-brand-emerald/20 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Futures &amp; Options (F&amp;O)</h3>
              <p className="text-gray-500 mb-4">
                Leverage the power of derivatives with calculated option strategies and futures calls backed by deep technical analysis.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Nifty, Bank Nifty &amp; stock options
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Clear strike price, entry &amp; exit levels
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  High reward-to-risk ratio trades
                </li>
              </ul>
            </div>

            {/* MTF */}
            <div id="mtf" className="scroll-reveal scroll-delay-3 bg-[#111118] border border-white/5 rounded-xl p-7 group hover:border-brand-emerald/20 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">MTF (Margin Trading)</h3>
              <p className="text-gray-500 mb-4">
                Amplify your returns with margin-backed positions. We identify high-conviction setups suitable for leveraged trading.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Carefully selected margin-worthy stocks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Risk-managed position sizing guidance
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Multi-day holding with clear targets
                </li>
              </ul>
            </div>

            {/* Long Term */}
            <div id="longterm" className="scroll-reveal scroll-delay-1 bg-[#111118] border border-white/5 rounded-xl p-7 group hover:border-brand-emerald/20 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Long Term Investment</h3>
              <p className="text-gray-500 mb-4">
                Build wealth over time with fundamentally strong stocks picked for sustainable growth and long-term compounding.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Fundamental + technical analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Portfolio-grade quality stocks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Ideal for SIP-style accumulation
                </li>
              </ul>
            </div>

            {/* Short Term */}
            <div id="shortterm" className="scroll-reveal scroll-delay-2 bg-[#111118] border border-white/5 rounded-xl p-7 group hover:border-brand-emerald/20 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Short Term Investment</h3>
              <p className="text-gray-500 mb-4">
                Swing trades spanning 1-4 weeks. Capture medium-term momentum with well-timed entries and exits.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  1-4 week holding period
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Trend &amp; breakout based entries
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  Perfect for working professionals
                </li>
              </ul>
            </div>

            {/* CTA Card */}
            <div className="scroll-reveal scroll-delay-3 bg-gradient-to-br from-brand-emerald/20 to-brand-emerald/5 border border-brand-emerald/20 rounded-xl p-7 flex flex-col justify-center items-center text-center">
              <h3 className="text-xl font-bold text-white mb-3">All Segments, One Platform</h3>
              <p className="text-gray-400 mb-6">
                Get signals across every market segment with a single subscription. No hidden charges.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-brand-emerald text-white rounded-lg font-semibold hover:opacity-90 transition-opacity animate-pulse-glow"
              >
                Get Started Free
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── S3: Performance Stats ── */}
      {performance && (
        <section className="py-20 bg-[#0A0A0F]" ref={statsRef}>
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-white mb-3 scroll-reveal">Our Track Record</h2>
            <p className="text-center text-gray-500 mb-12 scroll-reveal">Verified performance across all market segments</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: `${winRate}%`, label: 'Win Rate', color: 'text-brand-emerald', borderHover: 'hover:border-brand-emerald/30' },
                { value: totalSignals, label: 'Total Signals', color: 'text-white', borderHover: 'hover:border-white/20' },
                { value: hitTarget, label: 'Targets Hit', color: 'text-signal-green', borderHover: 'hover:border-signal-green/30' },
                { value: hitSL, label: 'Stop Loss Hit', color: 'text-signal-red', borderHover: 'hover:border-signal-red/30' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className={`scroll-reveal scroll-delay-${i + 1} bg-[#111118] border border-white/5 rounded-xl p-6 text-center transition-all duration-300 ${stat.borderHover} hover:shadow-lg`}
                >
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── S4: How It Works ── */}
      <section className="py-20 bg-[#111118]">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-3 scroll-reveal">How It Works</h2>
          <p className="text-center text-gray-500 mb-12 scroll-reveal">Start profiting in 3 simple steps</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Sign Up',
                desc: 'Create your free account in under 60 seconds. No credit card required.',
                icon: (
                  <svg className="w-8 h-8 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Get Signals',
                desc: 'Receive expert-curated buy/sell signals with entry, target, and stop loss levels.',
                icon: (
                  <svg className="w-8 h-8 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Book Profits',
                desc: 'Execute trades based on our signals and watch your portfolio grow consistently.',
                icon: (
                  <svg className="w-8 h-8 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`scroll-reveal scroll-delay-${i + 1} bg-[#0A0A0F] border border-white/5 rounded-xl p-8 relative group hover:border-brand-emerald/20 transition-colors`}
              >
                <span className="absolute top-4 right-4 text-5xl font-bold text-brand-emerald/10 group-hover:text-brand-emerald/20 transition-colors">
                  {item.step}
                </span>
                <div className="w-14 h-14 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S5: Signal Preview Grid ── */}
      <section className="py-20 bg-[#0A0A0F]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 scroll-reveal">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-brand-emerald border border-brand-emerald/30 mb-4 animate-shimmer"
              style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(0,176,144,0.1) 50%, transparent 100%)', backgroundSize: '200% 100%' }}
            >
              Limited Time: First 3 signals free
            </span>
            <h2 className="text-3xl font-bold text-white mb-3">Latest Trading Signals</h2>
            <p className="text-gray-500">Subscribe to unlock full signal details</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.map((signal, i) => {
              const isBuy = signal.action === 'BUY';
              const isPremiumLocked = signal.requiresPremium;

              return (
                <div
                  key={signal._id}
                  className={`scroll-reveal scroll-delay-${(i % 4) + 1} bg-[#111118] border border-white/5 rounded-xl p-6 relative ${
                    signal.status === 'ACTIVE' ? (isBuy ? 'border-l-4 border-l-signal-green' : 'border-l-4 border-l-signal-red') : ''
                  } hover:border-white/10 transition-colors`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${isBuy ? 'bg-signal-green text-white' : 'bg-signal-red text-white'}`}>
                        {signal.action}
                      </span>
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                        {SEGMENT_LABELS[signal.segment] || signal.segment}
                      </span>
                    </div>
                  </div>

                  <h3 className={`text-lg font-bold text-white mb-3 ${isPremiumLocked ? 'blur-sm select-none' : ''}`}>
                    {signal.instrument}
                  </h3>

                  <div className={`grid grid-cols-2 gap-3 text-sm ${isPremiumLocked ? 'blur-sm select-none' : ''}`}>
                    <div>
                      <p className="text-gray-500">Entry</p>
                      <p className="font-semibold text-gray-300">
                        {signal.entryPriceRange?.min} - {signal.entryPriceRange?.max}
                      </p>
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
                      <p className="font-semibold text-gray-300">{SUBCATEGORY_LABELS[signal.subCategory] || signal.subCategory}</p>
                    </div>
                  </div>

                  {isPremiumLocked && (
                    <div className="absolute inset-0 bg-[#111118]/80 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto text-brand-emerald mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <p className="font-semibold text-white">Premium Signal</p>
                        <Link href="/payment" className="text-sm text-brand-emerald hover:underline">Unlock Now</Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {signals.length === 0 && (
            <p className="text-center text-gray-600 py-8">No signals available yet</p>
          )}
        </div>
      </section>

      {/* ── S6: Testimonials ── */}
      <TestimonialCarousel dark />

      {/* ── S7: Countdown / Urgency ── */}
      <section className="py-20 bg-[#0A0A0F]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 scroll-reveal">
            Only <span className="text-brand-emerald">23 Spots</span> Left This Month
          </h2>
          <p className="text-gray-500 mb-10 scroll-reveal">Offer expires at end of month. Don&apos;t miss out.</p>

          <div className="flex justify-center gap-4 mb-10 scroll-reveal">
            {[
              { value: countdown.days, label: 'Days' },
              { value: countdown.hours, label: 'Hours' },
              { value: countdown.minutes, label: 'Minutes' },
              { value: countdown.seconds, label: 'Seconds' },
            ].map((item, i) => (
              <div key={i} className="bg-[#111118] border border-white/5 rounded-xl p-4 w-20 sm:w-24">
                <p className="text-2xl sm:text-3xl font-bold text-white">{String(item.value).padStart(2, '0')}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <Link
            href="/register"
            className="inline-flex items-center px-8 py-4 bg-brand-emerald text-white rounded-lg font-bold text-lg hover:opacity-90 transition-opacity animate-pulse-glow scroll-reveal"
          >
            Claim Your Spot
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── S8: Final CTA ── */}
      <section className="relative py-20 bg-[#111118] overflow-hidden">
        {/* Emerald radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,176,144,0.1)_0%,transparent_70%)]" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 scroll-reveal">
            Your Next Profitable Trade is <span className="text-brand-emerald">Waiting</span>
          </h2>
          <p className="text-lg text-gray-400 mb-8 scroll-reveal">
            Join thousands of traders who trust TheOneTrade for accurate, timely signals.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8 scroll-reveal">
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 bg-brand-emerald text-white rounded-lg font-bold text-lg hover:opacity-90 transition-opacity animate-pulse-glow"
            >
              Get Started Now
              <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/signals"
              className="inline-flex items-center px-8 py-4 border-2 border-white/20 text-gray-300 rounded-lg font-semibold text-lg hover:border-brand-emerald hover:text-brand-emerald transition-colors"
            >
              View Signals
            </Link>
          </div>

          <p className="text-sm text-gray-600 scroll-reveal">
            No credit card required · Cancel anytime · Instant access
          </p>
        </div>
      </section>

      {/* ── FOMO Toast (Fixed Bottom Left) ── */}
      {fomoToast && (
        <div
          className={`fixed bottom-6 left-6 z-50 bg-[#111118] border border-white/10 rounded-xl px-5 py-3 shadow-2xl max-w-xs ${
            fomoToast.visible ? 'animate-toast-in' : 'animate-toast-out'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-emerald/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white font-medium">
                {fomoToast.name} from {fomoToast.city}
              </p>
              <p className="text-xs text-gray-500">just joined · {Math.floor(Math.random() * 5) + 1} min ago</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
