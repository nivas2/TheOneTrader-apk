import mongoose, { Schema, Document } from 'mongoose';

export interface ILandingPageContentDocument extends Document {
  hero: {
    badgeText: string;
    headingLine1: string;
    headingLine2: string;
    typewriterPhrases: string[];
    profitLabel: string;
    ctaPrimaryText: string;
    ctaPrimaryLink: string;
    ctaSecondaryText: string;
    ctaSecondaryLink: string;
    onlineTradersSuffix: string;
    joinedTodayText: string;
  };
  mockTradeCard: {
    action: string;
    instrument: string;
    segment: string;
    category: string;
    entryMin: string;
    entryMax: string;
    target: string;
    stopLoss: string;
    pnl: string;
    statusLabel: string;
    badgeLabel: string;
  };
  socialProof: { value: string; label: string }[];
  whatWeOffer: {
    heading: string;
    subheading: string;
    segments: {
      id: string;
      title: string;
      tagline: string;
      description: string;
      features: string[];
    }[];
    allSegmentsCTA: {
      title: string;
      description: string;
      buttonText: string;
    };
  };
  performance: {
    heading: string;
    subheading: string;
  };
  howItWorks: {
    heading: string;
    subheading: string;
    steps: {
      stepNumber: string;
      title: string;
      description: string;
    }[];
  };
  signalPreview: {
    badgeText: string;
    heading: string;
    subheading: string;
  };
  testimonials: {
    heading: string;
  };
  countdown: {
    heading: string;
    spotsCount: string;
    subheading: string;
    buttonText: string;
    buttonLink: string;
  };
  finalCTA: {
    heading: string;
    subheading: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
    footerText: string;
  };
  fomo: {
    names: string[];
    cities: string[];
  };
}

const LandingPageContentSchema = new Schema<ILandingPageContentDocument>(
  {
    hero: {
      badgeText: { type: String, default: '2,500+ Indian Traders Trust Us' },
      headingLine1: { type: String, default: 'Stop Guessing.' },
      headingLine2: { type: String, default: 'Start Profiting.' },
      typewriterPhrases: {
        type: [String],
        default: [
          'Expert-curated signals delivered instantly.',
          '85%+ win rate across all segments.',
          'Join 2,500+ profitable Indian traders.',
        ],
      },
      profitLabel: { type: String, default: 'Total Profit Generated' },
      ctaPrimaryText: { type: String, default: 'Start Trading Now' },
      ctaPrimaryLink: { type: String, default: '/register' },
      ctaSecondaryText: { type: String, default: 'View Live Signals' },
      ctaSecondaryLink: { type: String, default: '/signals' },
      onlineTradersSuffix: { type: String, default: 'traders online now' },
      joinedTodayText: { type: String, default: '12 joined today' },
    },
    mockTradeCard: {
      action: { type: String, default: 'BUY' },
      instrument: { type: String, default: 'RELIANCE' },
      segment: { type: String, default: 'Intraday' },
      category: { type: String, default: 'Equity' },
      entryMin: { type: String, default: '₹2,540' },
      entryMax: { type: String, default: '₹2,555' },
      target: { type: String, default: '₹2,620' },
      stopLoss: { type: String, default: '₹2,510' },
      pnl: { type: String, default: '+24.8%' },
      statusLabel: { type: String, default: 'Target Hit' },
      badgeLabel: { type: String, default: 'Live Signal' },
    },
    socialProof: {
      type: [{ value: { type: String }, label: { type: String } }],
      default: [
        { value: '2,500+', label: 'Active Traders' },
        { value: '85%+', label: 'Win Rate' },
        { value: '4.8/5', label: 'Rating' },
        { value: '3 Years', label: 'Track Record' },
        { value: '24/7', label: 'Support' },
      ],
    },
    whatWeOffer: {
      heading: { type: String, default: 'What We Offer' },
      subheading: { type: String, default: 'Expert signals across every market segment — pick your trading style, we deliver the profits' },
      segments: {
        type: [
          {
            id: { type: String },
            title: { type: String },
            tagline: { type: String },
            description: { type: String },
            features: [{ type: String }],
          },
        ],
        default: [
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
      },
      allSegmentsCTA: {
        title: { type: String, default: 'All 5 Segments. One Subscription.' },
        description: { type: String, default: 'Get signals across Intraday, F&O, MTF, Long Term & Short Term — no hidden charges.' },
        buttonText: { type: String, default: 'Get Started Free' },
      },
    },
    performance: {
      heading: { type: String, default: 'Our Track Record' },
      subheading: { type: String, default: 'Verified performance across all market segments' },
    },
    howItWorks: {
      heading: { type: String, default: 'How It Works' },
      subheading: { type: String, default: 'Start profiting in 3 simple steps' },
      steps: {
        type: [
          {
            stepNumber: { type: String },
            title: { type: String },
            description: { type: String },
          },
        ],
        default: [
          { stepNumber: '01', title: 'Sign Up', description: 'Create your free account in under 60 seconds. No credit card required.' },
          { stepNumber: '02', title: 'Get Signals', description: 'Receive expert-curated buy/sell signals with entry, target, and stop loss levels.' },
          { stepNumber: '03', title: 'Book Profits', description: 'Execute trades based on our signals and watch your portfolio grow consistently.' },
        ],
      },
    },
    signalPreview: {
      badgeText: { type: String, default: 'Limited Time: First 3 signals free' },
      heading: { type: String, default: 'Latest Trading Signals' },
      subheading: { type: String, default: 'Subscribe to unlock full signal details' },
    },
    testimonials: {
      heading: { type: String, default: 'What Our Traders Say' },
    },
    countdown: {
      heading: { type: String, default: 'Only {spots} Left This Month' },
      spotsCount: { type: String, default: '23 Spots' },
      subheading: { type: String, default: "Offer expires at end of month. Don't miss out." },
      buttonText: { type: String, default: 'Claim Your Spot' },
      buttonLink: { type: String, default: '/register' },
    },
    finalCTA: {
      heading: { type: String, default: 'Your Next Profitable Trade is Waiting' },
      subheading: { type: String, default: 'Join thousands of traders who trust TheOneTrade for accurate, timely signals.' },
      primaryButtonText: { type: String, default: 'Get Started Now' },
      primaryButtonLink: { type: String, default: '/register' },
      secondaryButtonText: { type: String, default: 'View Signals' },
      secondaryButtonLink: { type: String, default: '/signals' },
      footerText: { type: String, default: 'No credit card required · Cancel anytime · Instant access' },
    },
    fomo: {
      names: {
        type: [String],
        default: [
          'Rahul M.', 'Priya S.', 'Amit K.', 'Sneha R.', 'Vikram P.',
          'Ananya D.', 'Rohan G.', 'Kavita N.', 'Arjun B.', 'Meera T.',
          'Suresh L.', 'Divya C.', 'Karan J.', 'Neha W.', 'Raj V.',
        ],
      },
      cities: {
        type: [String],
        default: [
          'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
          'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
        ],
      },
    },
  },
  { timestamps: true }
);

export const LandingPageContent = mongoose.model<ILandingPageContentDocument>('LandingPageContent', LandingPageContentSchema);
