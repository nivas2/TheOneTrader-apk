import { NextResponse } from 'next/server';

const SYMBOLS = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'BANKNIFTY' },
  { symbol: 'NIFTY_MIDCAP_100.NS', name: 'NIFTY MIDCAP 100' },
  { symbol: '^NSMIDCP', name: 'NIFTY NEXT 50' },
  { symbol: '^CNXFIN', name: 'FINNIFTY' },
  { symbol: '^CNX100', name: 'NIFTY 100' },
  { symbol: '^CRSLDX', name: 'NIFTY 500' },
  { symbol: 'NIFTY_SMLCAP_100.NS', name: 'NIFTY SMALLCAP 100' },
];

interface MarketIndex {
  name: string;
  price: string;
  change: string;
  up: boolean;
}

let cache: { data: MarketIndex[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchIndex(symbol: string, name: string): Promise<MarketIndex | null> {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;

    if (!price || !prevClose) return null;

    const changeVal = price - prevClose;
    const changePct = (changeVal / prevClose) * 100;

    return {
      name,
      price: price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      up: changePct >= 0,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({ data: cache.data });
  }

  const results = await Promise.all(
    SYMBOLS.map((s) => fetchIndex(s.symbol, s.name))
  );

  const indices = results.filter((r): r is MarketIndex => r !== null);

  // Only update cache if we got data
  if (indices.length > 0) {
    cache = { data: indices, timestamp: Date.now() };
  }

  return NextResponse.json({ data: indices.length > 0 ? indices : cache?.data || [] });
}
