'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import MarqueeBanner from '@/components/MarqueeBanner';
import LeadCaptureModal from '@/components/LeadCaptureModal';
import TestimonialCarousel from '@/components/TestimonialCarousel';
import PublicSignalHistory from '@/components/PublicSignalHistory';
import PricingSection from '@/components/PricingSection';

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

// ── Default Content ── (fallback if API fails)

const DEFAULT_CONTENT = {
  hero: {
    badgeText: '2,500+ Indian Traders Trust Us',
    headingLine1: 'Stop Guessing.',
    headingLine2: 'Start Profiting.',
    typewriterPhrases: [
      'Expert-curated signals delivered instantly.',
      '85%+ win rate across all segments.',
      'Join 2,500+ profitable Indian traders.',
    ],
    profitLabel: 'Total Profit Generated',
    profitAmount: '12,47,605',
    onlineTraders: 47,
    ctaPrimaryText: 'Start Trading Now',
    ctaPrimaryLink: '/register',
    ctaSecondaryText: 'View Live Signals',
    ctaSecondaryLink: '/signals',
    onlineTradersSuffix: 'traders online now',
    joinedTodayText: '12 joined today',
  },
  mockTradeCard: {
    action: 'BUY',
    instrument: 'RELIANCE',
    segment: 'Intraday',
    category: 'Equity',
    entryMin: '₹2,540',
    entryMax: '₹2,555',
    target: '₹2,620',
    stopLoss: '₹2,510',
    pnl: '+24.8%',
    statusLabel: 'Target Hit',
    badgeLabel: 'Live Signal',
  },
  heroCards: [
    {
      type: 'trade' as const,
      action: 'BUY',
      instrument: 'RELIANCE',
      segment: 'Intraday',
      category: 'Equity',
      entryMin: '₹2,540',
      entryMax: '₹2,555',
      target: '₹2,620',
      stopLoss: '₹2,510',
      pnl: '+24.8%',
      statusLabel: 'Target Hit',
      badgeLabel: 'Top Signal',
    },
    {
      type: 'trade' as const,
      action: 'BUY',
      instrument: 'TATA MOTORS',
      segment: 'F&O',
      category: 'Options',
      entryMin: '₹890',
      entryMax: '₹895',
      target: '₹950',
      stopLoss: '₹870',
      pnl: '+18.5%',
      statusLabel: 'Target Hit',
      badgeLabel: 'Top Signal',
    },
    {
      type: 'banner' as const,
      heading: 'Join 2,500+ Traders',
      description: 'Get expert signals across all market segments with 85%+ accuracy',
      bgGradient: 'from-brand-emerald to-emerald-700',
      ctaText: 'Start Free Trial',
      ctaLink: '/register',
    },
  ],
  socialProof: [
    { value: '2,500+', label: 'Active Traders' },
    { value: '85%+', label: 'Win Rate' },
    { value: '4.8/5', label: 'Rating' },
    { value: '3 Years', label: 'Track Record' },
    { value: '24/7', label: 'Support' },
  ],
  whatWeOffer: {
    heading: 'What We Offer',
    subheading: 'Expert signals across every market segment — pick your trading style, we deliver the profits',
    segments: [
      {
        id: 'intraday',
        title: 'Intraday Trading',
        tagline: 'Fast-paced, same-day trades for daily profits',
        description: 'Our intraday signals are designed for traders who want to capitalize on daily market movements. Every signal comes with precise entry price, target, and stop loss — so you know exactly when to get in and when to get out. No guesswork, no overnight risk.',
        features: [
          'Same-day buy & sell signals with clear entry/exit',
          'Tight stop losses for capital protection',
          '2-5 high-conviction signals daily during market hours',
          'Covers NSE & BSE equities with real-time alerts',
        ],
      },
      {
        id: 'fno',
        title: 'Futures & Options',
        tagline: 'Leverage derivatives for amplified returns',
        description: 'Trade Nifty, Bank Nifty, and stock options with confidence. Our F&O signals are backed by deep technical analysis, option chain data, and open interest tracking. Each call includes the exact strike price, premium range, and predefined risk levels.',
        features: [
          'Nifty, Bank Nifty & stock option calls',
          'Clear strike price, premium entry & exit levels',
          'High reward-to-risk ratio setups',
          'Hedging strategies & spread recommendations',
        ],
      },
      {
        id: 'mtf',
        title: 'MTF (Margin Trading)',
        tagline: 'Maximize capital efficiency with leverage',
        description: 'Margin Trading Facility signals help you take larger positions with smaller capital. We identify high-conviction stocks suitable for margin-backed trades with strict risk management — so you can amplify gains without reckless exposure.',
        features: [
          'Carefully selected margin-worthy stocks',
          'Risk-managed position sizing guidance',
          'Multi-day holding with clear targets & SL',
          'Ideal for traders with limited capital wanting bigger exposure',
        ],
      },
      {
        id: 'longterm',
        title: 'Long Term Investment',
        tagline: 'Build lasting wealth with quality stocks',
        description: 'For investors who think beyond daily charts. Our long-term picks are backed by fundamental research — revenue growth, earnings quality, competitive moats, and management track record. Build a portfolio that compounds wealth over months and years.',
        features: [
          'Fundamental + technical analysis combined',
          'Portfolio-grade quality stocks with strong moats',
          'Ideal for SIP-style accumulation and wealth building',
          'Quarterly reviews with updated targets',
        ],
      },
      {
        id: 'shortterm',
        title: 'Short Term Investment',
        tagline: 'Swing trades for steady, consistent returns',
        description: "Perfect for working professionals who can't watch the market all day. Our short-term swing trade signals have a 1-4 week holding period, capturing medium-term trends and breakout moves. Set your orders and let the market work for you.",
        features: [
          '1-4 week holding period for comfortable execution',
          'Trend & breakout based high-probability entries',
          'Perfect for salaried professionals and part-time traders',
          'Weekly portfolio updates with hold/exit guidance',
        ],
      },
    ],
    allSegmentsCTA: {
      title: 'All 5 Segments. One Subscription.',
      description: 'Get signals across Intraday, F&O, MTF, Long Term & Short Term — no hidden charges.',
      buttonText: 'Get Started Free',
      buttonLink: '/register',
    },
  },
  performance: {
    heading: 'Our Track Record',
    subheading: 'Verified performance across all market segments',
  },
  howItWorks: {
    heading: 'How It Works',
    subheading: 'Start profiting in 3 simple steps',
    steps: [
      { stepNumber: '01', title: 'Sign Up', description: 'Create your free account in under 60 seconds. No credit card required.' },
      { stepNumber: '02', title: 'Get Signals', description: 'Receive expert-curated buy/sell signals with entry, target, and stop loss levels.' },
      { stepNumber: '03', title: 'Book Profits', description: 'Execute trades based on our signals and watch your portfolio grow consistently.' },
    ],
  },
  testimonials: {
    heading: 'What Our Traders Say',
  },
  countdown: {
    heading: 'Only {spots} Left This Month',
    spotsCount: '23 Spots',
    subheading: "Offer expires at end of month. Don't miss out.",
    buttonText: 'Claim Your Spot',
    buttonLink: '/register',
  },
  finalCTA: {
    heading: 'Your Next Profitable Trade is Waiting',
    subheading: 'Join thousands of traders who trust TheOneTrade for accurate, timely signals.',
    primaryButtonText: 'Get Started Now',
    primaryButtonLink: '/register',
    secondaryButtonText: 'View Signals',
    secondaryButtonLink: '/signals',
    footerText: 'No credit card required · Cancel anytime · Instant access',
  },
  fomo: {
    names: [
      'Rahul M.', 'Priya S.', 'Amit K.', 'Sneha R.', 'Vikram P.',
      'Ananya D.', 'Rohan G.', 'Kavita N.', 'Arjun B.', 'Meera T.',
      'Suresh L.', 'Divya C.', 'Karan J.', 'Neha W.', 'Raj V.',
    ],
    cities: [
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
      'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
    ],
  },
};

// Deep merge helper
function deepMerge(defaults: any, overrides: any): any {
  if (!overrides) return defaults;
  const result: any = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (overrides[key] === undefined || overrides[key] === null) continue;
    if (Array.isArray(defaults[key])) {
      result[key] = overrides[key];
    } else if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
      result[key] = deepMerge(defaults[key], overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

// Gradient / layout config per segment index
const SEGMENT_STYLES = [
  { gradient: 'from-brand-emerald to-emerald-600', checkColor: 'text-brand-emerald', reverse: false },
  { gradient: 'from-blue-600 to-indigo-700', checkColor: 'text-blue-600', reverse: true },
  { gradient: 'from-amber-500 to-orange-600', checkColor: 'text-amber-600', reverse: false },
  { gradient: 'from-purple-600 to-violet-700', checkColor: 'text-purple-600', reverse: true },
  { gradient: 'from-teal-500 to-cyan-600', checkColor: 'text-teal-600', reverse: false },
];

const SEGMENT_ICONS = [
  <path key="0" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
  <path key="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  <path key="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  <path key="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />,
  <path key="4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
];

const HOW_IT_WORKS_ICONS = [
  <path key="0" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  <path key="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  <path key="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
];

// ── Component ──

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [performance, setPerformance] = useState<any>(null);
  const [isApp, setIsApp] = useState(false);
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [heroCardIndex, setHeroCardIndex] = useState(0);

  // FOMO
  const [profitCounter, setProfitCounter] = useState(1247605);
  const [onlineTraders, setOnlineTraders] = useState(47);

  // Sync profit/online from CMS when content loads
  useEffect(() => {
    const amt = parseInt(String(content.hero?.profitAmount || '1247605').replace(/,/g, ''), 10) || 1247605;
    setProfitCounter(amt);
    setOnlineTraders(content.hero?.onlineTraders || 47);
  }, [content.hero?.profitAmount, content.hero?.onlineTraders]);
  const [fomoToast, setFomoToast] = useState<{ name: string; city: string; visible: boolean } | null>(null);

  // Countdown
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Typewriter
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterIndex, setTypewriterIndex] = useState(0);

  // Stats
  const statsRef = useRef<HTMLDivElement>(null);
  const offerCarouselRef = useRef<HTMLDivElement>(null);
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
      api.get('/public/signals/performance').then((res) => setPerformance(res.data.data)).catch(() => {});
      api.get('/public/landing-content/public')
        .then((res) => {
          if (res.data.data) {
            setContent(deepMerge(DEFAULT_CONTENT, res.data.data));
          }
        })
        .catch(() => {});
    }
  }, [isApp]);

  // Listen for segment selection events from Navbar
  useEffect(() => {
    const handler = (e: Event) => {
      const segId = (e as CustomEvent).detail;
      setActiveSegment((prev) => prev === segId ? null : segId);
    };
    window.addEventListener('selectSegment', handler);
    return () => window.removeEventListener('selectSegment', handler);
  }, []);

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

  // Typewriter - uses dynamic phrases
  const typewriterPhrases = content.hero.typewriterPhrases;
  useEffect(() => {
    const phrase = typewriterPhrases[typewriterIndex % typewriterPhrases.length];
    if (!phrase) return;
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
        if (charIndex === 0) { isDeleting = false; setTypewriterIndex((prev) => (prev + 1) % typewriterPhrases.length); return; }
        timeout = setTimeout(type, 30);
      }
    };
    let timeout = setTimeout(type, 500);
    return () => clearTimeout(timeout);
  }, [typewriterIndex, typewriterPhrases]);

  // FOMO toast - uses dynamic names/cities
  const fomoNames = content.fomo.names;
  const fomoCities = content.fomo.cities;
  useEffect(() => {
    if (fomoNames.length === 0 || fomoCities.length === 0) return;
    const showToast = () => {
      const name = fomoNames[Math.floor(Math.random() * fomoNames.length)];
      const city = fomoCities[Math.floor(Math.random() * fomoCities.length)];
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
  }, [fomoNames, fomoCities]);

  // Mobile: auto-scroll "What We Offer" carousel (infinite loop, resumes after touch)
  useEffect(() => {
    const container = offerCarouselRef.current;
    if (!container) return;
    const mql = window.matchMedia('(max-width: 767px)');
    if (!mql.matches) return;

    let idx = 0;
    let intervalId: ReturnType<typeof setInterval>;
    let resumeTimeout: ReturnType<typeof setTimeout>;

    const scrollToCard = (index: number) => {
      const card = container.children[index] as HTMLElement;
      if (card) {
        const scrollPos = card.offsetLeft - (container.offsetWidth - card.offsetWidth) / 2;
        container.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
      }
    };

    const autoScroll = () => {
      const total = container.children.length;
      idx = (idx + 1) % total;
      scrollToCard(idx);
    };

    const startInterval = () => {
      clearInterval(intervalId);
      intervalId = setInterval(autoScroll, 3500);
    };

    startInterval();

    const onTouchStart = () => {
      clearInterval(intervalId);
      clearTimeout(resumeTimeout);
    };

    const onTouchEnd = () => {
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => {
        // Sync idx to whichever card the user swiped to
        const cards = Array.from(container.children) as HTMLElement[];
        const center = container.scrollLeft + container.offsetWidth / 2;
        let closest = 0;
        let minDist = Infinity;
        cards.forEach((card, i) => {
          const dist = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
          if (dist < minDist) { minDist = dist; closest = i; }
        });
        idx = closest;
        startInterval();
      }, 3000);
    };

    container.addEventListener('touchstart', onTouchStart);
    container.addEventListener('touchend', onTouchEnd);

    return () => {
      clearInterval(intervalId);
      clearTimeout(resumeTimeout);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Hero carousel auto-rotation
  const heroCards = content.heroCards || [];
  useEffect(() => {
    if (heroCards.length <= 1) return;
    const interval = setInterval(() => {
      setHeroCardIndex((prev) => (prev + 1) % heroCards.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroCards.length]);

  if (isApp) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const formatINR = (num: number) => num.toLocaleString('en-IN');

  const { hero, socialProof, whatWeOffer, howItWorks, countdown: ctd, finalCTA } = content;

  return (
    <>
      <MarqueeBanner />
      <LeadCaptureModal />

      {/* ── Hero Section ── */}
      <section className="relative bg-gradient-to-br from-white via-emerald-50/30 to-white overflow-hidden py-10 md:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-brand-emerald/20 bg-brand-emerald/5 mb-4 md:mb-6">
                <span className="w-2 h-2 rounded-full bg-brand-emerald animate-live-dot" />
                <span className="text-xs md:text-sm text-brand-emerald font-medium">{hero.badgeText}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-text-heading leading-tight mb-4 md:mb-6">
                {hero.headingLine1}{' '}
                <span className="text-brand-emerald">{hero.headingLine2}</span>
              </h1>

              <p className="text-sm md:text-lg text-text-body mb-6 md:mb-8 min-h-[1.5rem] md:min-h-[1.75rem]">
                {typewriterText}
                <span className="animate-pulse text-brand-emerald">|</span>
              </p>

              <div className="mb-6 md:mb-8">
                <p className="text-xs md:text-sm text-gray-500 mb-1">{hero.profitLabel}</p>
                <p className="text-2xl sm:text-4xl font-bold text-brand-emerald">
                  ₹{formatINR(profitCounter)}+
                </p>
              </div>

              <div className="flex gap-2 sm:gap-4 mb-8">
                <Link
                  href={hero.ctaPrimaryLink}
                  className="inline-flex items-center px-4 py-3 sm:px-8 sm:py-4 bg-brand-emerald text-white rounded-lg font-bold text-sm sm:text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-emerald/20"
                >
                  {hero.ctaPrimaryText}
                  <svg className="ml-2 w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href={hero.ctaSecondaryLink}
                  className="inline-flex items-center px-4 py-3 sm:px-8 sm:py-4 border-2 border-gray-200 text-text-body rounded-lg font-semibold text-sm sm:text-lg hover:border-brand-emerald hover:text-brand-emerald transition-colors"
                >
                  {hero.ctaSecondaryText}
                </Link>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-emerald animate-live-dot" />
                  {onlineTraders} {hero.onlineTradersSuffix}
                </span>
                <span className="text-gray-300">·</span>
                <span>{hero.joinedTodayText}</span>
              </div>
            </div>

            {/* Hero Carousel */}
            {heroCards.length > 0 && (
              <div className="hidden lg:flex flex-col items-center gap-4">
                <div className="relative w-80 h-[280px]">
                  {heroCards.map((card: any, i: number) => {
                    const isActive = i === heroCardIndex;
                    return (
                      <div
                        key={i}
                        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                          isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                        }`}
                      >
                        {card.type === 'banner' ? (
                          /* Banner Card */
                          <div className={`bg-gradient-to-br ${card.bgGradient || 'from-brand-emerald to-emerald-700'} rounded-2xl p-6 w-80 h-full shadow-xl flex flex-col justify-center text-white`}>
                            <h3 className="text-2xl font-bold mb-3">{card.heading}</h3>
                            <p className="text-white/80 text-sm mb-6 leading-relaxed">{card.description}</p>
                            {card.ctaText && (
                              <Link
                                href={card.ctaLink || '/register'}
                                className="inline-flex items-center self-start px-5 py-2.5 bg-white text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
                              >
                                {card.ctaText}
                                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </Link>
                            )}
                          </div>
                        ) : card.type === 'image' ? (
                          /* Image Card */
                          <div className="bg-white border border-gray-100 rounded-2xl w-80 h-full shadow-xl flex flex-col overflow-hidden">
                            {card.imageUrl && (
                              <img
                                src={`${(() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL || '').origin; } catch { return 'http://localhost:5000'; } })()}${card.imageUrl}`}
                                alt={card.caption || 'Promotional image'}
                                className="w-full h-[220px] object-cover"
                              />
                            )}
                            {card.caption && (
                              <div className="px-4 py-3 text-center">
                                <p className="text-sm font-medium text-text-heading">{card.caption}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Trade Card */
                          <div className="animate-float bg-white border border-gray-100 rounded-2xl p-6 w-80 shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${card.action === 'BUY' ? 'bg-signal-green' : 'bg-signal-red'} text-white`}>{card.action}</span>
                              <span className="text-xs text-gray-400">{card.badgeLabel}</span>
                            </div>
                            <h3 className="text-xl font-bold text-text-heading mb-1">{card.instrument}</h3>
                            <p className="text-sm text-gray-400 mb-4">{card.segment} · {card.category}</p>
                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                              <div>
                                <p className="text-gray-400">Entry</p>
                                <p className="font-semibold text-text-heading">{card.entryMin} - {card.entryMax}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Target</p>
                                <p className="font-semibold text-signal-green">{card.target}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Stop Loss</p>
                                <p className="font-semibold text-signal-red">{card.stopLoss}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">P&L</p>
                                <p className="font-semibold text-signal-green">{card.pnl}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                              <span className="w-2 h-2 rounded-full bg-signal-green animate-live-dot" />
                              <span className="text-xs text-signal-green font-medium">{card.statusLabel}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Carousel Dots */}
                {heroCards.length > 1 && (
                  <div className="flex gap-2">
                    {heroCards.map((_: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setHeroCardIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          i === heroCardIndex ? 'bg-brand-emerald w-6' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Social Proof Bar ── */}
      <section className="relative bg-[#0A0A0F] md:bg-white border-y border-gray-800 md:border-gray-100 py-6 md:py-8 overflow-hidden">
        {/* Mobile animated green particles */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-brand-emerald/50 md:hidden"
            style={{
              left: `${8 + i * 12}%`,
              bottom: '-10%',
              animation: `mobileParticle ${4 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.6}s`,
            }}
          />
        ))}
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            {socialProof.map((item, i) => (
              <div key={i} className={`scroll-reveal scroll-delay-1${i === socialProof.length - 1 && socialProof.length % 2 !== 0 ? ' col-span-2 md:col-span-1' : ''}`}>
                <p className="text-2xl font-bold text-white md:text-text-heading">{item.value}</p>
                <p className="text-sm text-gray-400 md:text-text-body">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What We Offer — Segment Categories ── */}
      <section className="py-12 md:py-20 bg-brand-gray">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-text-heading mb-2 md:mb-3 scroll-reveal">{whatWeOffer.heading}</h2>
          <p className="text-center text-text-body text-sm md:text-base mb-8 md:mb-14 scroll-reveal">
            {whatWeOffer.subheading}
          </p>

          {/* Mobile: horizontal carousel · Desktop: stacked cards */}
          <div
            ref={offerCarouselRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:block md:overflow-visible md:gap-0 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
          >

          {whatWeOffer.segments.map((seg, i) => {
            const style = SEGMENT_STYLES[i % SEGMENT_STYLES.length];
            const icon = SEGMENT_ICONS[i % SEGMENT_ICONS.length];
            const isLast = i === whatWeOffer.segments.length - 1;
            return (
              <div key={seg.id} id={seg.id} className={`w-[85vw] max-w-[85vw] snap-center flex-shrink-0 md:w-auto md:max-w-none scroll-reveal mb-0 ${isLast ? 'md:mb-6' : 'md:mb-10'} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
                <div className={`md:flex ${style.reverse ? 'md:flex-row-reverse' : ''}`}>
                  <div className={`md:w-1/3 bg-gradient-to-br ${style.gradient} p-4 md:p-8 flex flex-col justify-center text-white`}>
                    <svg className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {icon}
                    </svg>
                    <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-2">{seg.title}</h3>
                    <p className="text-white/80 text-sm">{seg.tagline}</p>
                  </div>
                  <div className="md:w-2/3 p-4 md:p-8">
                    <p className="text-sm md:text-base text-text-body mb-3 md:mb-5 line-clamp-3 md:line-clamp-none">{seg.description}</p>
                    <div className="grid gap-2 md:gap-4 md:grid-cols-2">
                      {seg.features.map((feat, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <svg className={`w-4 h-4 md:w-5 md:h-5 ${style.checkColor} mt-0.5 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs md:text-sm text-text-body">{feat}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveSegment((prev) => prev === seg.id ? null : seg.id)}
                      className={`mt-3 md:mt-4 text-sm font-medium transition-colors ${
                        activeSegment === seg.id ? 'text-brand-emerald' : 'text-gray-400 hover:text-brand-emerald'
                      }`}
                    >
                      {activeSegment === seg.id ? 'Hide Past Signals' : 'View Past Signals'}
                    </button>
                  </div>
                </div>
                <PublicSignalHistory segment={seg.id} visible={activeSegment === seg.id} />
              </div>
            );
          })}

          </div>

          {/* Carousel dots - mobile only */}
          <div className="flex justify-center gap-1.5 mt-3 md:hidden">
            {whatWeOffer.segments.map((_, i) => (
              <span key={i} className="w-2 h-2 rounded-full bg-gray-300" />
            ))}
          </div>

          {/* All segments CTA */}
          <div className="scroll-reveal text-center mt-8 md:mt-10">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-6 md:inline-block md:px-10 md:py-8">
              <h3 className="text-lg md:text-xl font-bold text-text-heading mb-2">{whatWeOffer.allSegmentsCTA.title}</h3>
              <p className="text-sm md:text-base text-text-body mb-4 md:mb-5">{whatWeOffer.allSegmentsCTA.description}</p>
              <Link href={whatWeOffer.allSegmentsCTA.buttonLink || '/register'} className="btn-primary text-base md:text-lg px-6 py-2.5 md:px-8 md:py-3">
                {whatWeOffer.allSegmentsCTA.buttonText}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Performance Stats ── */}
      {performance && (
        <section className="py-12 md:py-20 bg-white" ref={statsRef}>
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 md:mb-3 scroll-reveal">{content.performance.heading}</h2>
            <p className="text-center text-text-body text-sm md:text-base mb-8 md:mb-12 scroll-reveal">{content.performance.subheading}</p>
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

      {/* ── Pricing Section ── */}
      <PricingSection />

      {/* ── How It Works ── */}
      <section className="py-12 md:py-20 bg-brand-gray">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 md:mb-3 scroll-reveal">{howItWorks.heading}</h2>
          <p className="text-center text-text-body text-sm md:text-base mb-8 md:mb-12 scroll-reveal">{howItWorks.subheading}</p>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.steps.map((item, i) => (
              <div key={i} className={`scroll-reveal scroll-delay-${i + 1} card relative group hover:shadow-lg hover:border-brand-emerald/20 transition-all`}>
                <span className="absolute top-4 right-4 text-5xl font-bold text-brand-emerald/10 group-hover:text-brand-emerald/20 transition-colors">
                  {item.stepNumber}
                </span>
                <div className="w-14 h-14 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-5">
                  <svg className="w-8 h-8 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {HOW_IT_WORKS_ICONS[i % HOW_IT_WORKS_ICONS.length]}
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-heading mb-2">{item.title}</h3>
                <p className="text-text-body">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <TestimonialCarousel heading={content.testimonials.heading} />

      {/* ── Countdown / Urgency ── */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 scroll-reveal">
            {ctd.heading.includes('{spots}') ? (
              <>
                {ctd.heading.split('{spots}')[0]}
                <span className="text-brand-emerald">{ctd.spotsCount}</span>
                {ctd.heading.split('{spots}')[1]}
              </>
            ) : (
              ctd.heading
            )}
          </h2>
          <p className="text-text-body mb-10 scroll-reveal">{ctd.subheading}</p>

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
            href={ctd.buttonLink}
            className="inline-flex items-center px-8 py-4 bg-brand-emerald text-white rounded-lg font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-emerald/20 scroll-reveal"
          >
            {ctd.buttonText}
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-12 md:py-16 bg-brand-emerald text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 scroll-reveal">{finalCTA.heading}</h2>
          <p className="text-sm md:text-lg opacity-90 mb-6 md:mb-8 scroll-reveal">{finalCTA.subheading}</p>
          <div className="flex justify-center gap-2 sm:gap-4 mb-6 scroll-reveal">
            <Link href={finalCTA.primaryButtonLink} className="inline-block bg-white text-brand-emerald px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-bold text-sm sm:text-lg hover:bg-gray-100 transition-colors">
              {finalCTA.primaryButtonText}
            </Link>
            <Link href={finalCTA.secondaryButtonLink} className="inline-block border-2 border-white/40 text-white px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold text-sm sm:text-lg hover:bg-white/10 transition-colors">
              {finalCTA.secondaryButtonText}
            </Link>
          </div>
          <p className="text-sm opacity-70 scroll-reveal">{finalCTA.footerText}</p>
        </div>
      </section>

      {/* ── FOMO Toast ── */}
      {fomoToast && (
        <div
          className={`fixed bottom-4 left-4 right-4 sm:right-auto sm:left-6 sm:bottom-6 z-50 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-xl sm:max-w-xs ${
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
