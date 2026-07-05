import { Server as SocketServer } from 'socket.io';
import { NseIndia } from 'stock-nse-india';
import { SOCKET_EVENTS, MarketIndex } from '@theonetrade/shared-types';

const nse = new NseIndia();

// NSE index key → display name
const NSE_INDEX_MAP: Record<string, string> = {
  'NIFTY 50': 'NIFTY 50',
  'NIFTY BANK': 'BANKNIFTY',
  'NIFTY MIDCAP 100': 'NIFTY MIDCAP 100',
  'NIFTY NEXT 50': 'NIFTY NEXT 50',
  'NIFTY FIN SERVICE': 'FINNIFTY',
  'NIFTY 100': 'NIFTY 100',
  'NIFTY 500': 'NIFTY 500',
  'NIFTY SMLCAP 100': 'NIFTY SMALLCAP 100',
};

const BSE_SENSEX_URL = 'https://api.bseindia.com/BseIndiaAPI/api/Sensex/getSensexData?json=t&fields=sc_name,last,change,pchange&scripcode=&group=&exchange=&status=';

let lastKnownData: MarketIndex[] = [];
let intervalRef: ReturnType<typeof setInterval> | null = null;

function isMarketHours(): boolean {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);

  const day = ist.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 9:15 AM to 3:30 PM IST
  return timeInMinutes >= 555 && timeInMinutes <= 930;
}

function formatPrice(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(pChange: number): string {
  const sign = pChange >= 0 ? '+' : '';
  return `${sign}${pChange.toFixed(2)}%`;
}

async function fetchNSEIndices(): Promise<MarketIndex[]> {
  const data = await nse.getAllIndices();
  const indices: MarketIndex[] = [];
  const items = (data as any).data || [];

  for (const item of items) {
    const displayName = NSE_INDEX_MAP[item.indexName || item.index];
    if (displayName) {
      const pChange = item.percChange ?? item.percentChange ?? 0;
      indices.push({
        name: displayName,
        price: formatPrice(item.last),
        change: formatChange(pChange),
        up: pChange >= 0,
      });
    }
  }

  return indices;
}

async function fetchSensex(): Promise<MarketIndex | null> {
  try {
    const res = await fetch(BSE_SENSEX_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Referer': 'https://www.bseindia.com/',
      },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    // BSE API returns an array; first item is SENSEX
    if (data && Array.isArray(data) && data.length > 0) {
      const sensex = data[0];
      const last = parseFloat(sensex.currentvalue || sensex.last || sensex.ltp || '0');
      const pChange = parseFloat(sensex.perchg || sensex.pchange || '0');
      if (last > 0) {
        return {
          name: 'SENSEX',
          price: formatPrice(last),
          change: formatChange(pChange),
          up: pChange >= 0,
        };
      }
    }
  } catch (err) {
    console.error('[TickerService] BSE fetch error:', (err as Error).message);
  }
  return null;
}

async function fetchAllIndices(): Promise<MarketIndex[]> {
  const results: MarketIndex[] = [];

  try {
    const nseIndices = await fetchNSEIndices();
    results.push(...nseIndices);
  } catch (err) {
    console.error('[TickerService] NSE fetch error:', (err as Error).message);
  }

  const sensex = await fetchSensex();
  if (sensex) {
    // Insert SENSEX after NIFTY 50 (index 1)
    const niftyIdx = results.findIndex((i) => i.name === 'NIFTY 50');
    if (niftyIdx >= 0) {
      results.splice(niftyIdx + 1, 0, sensex);
    } else {
      results.unshift(sensex);
    }
  }

  return results;
}

async function broadcastTicker(io: SocketServer): Promise<void> {
  const indices = await fetchAllIndices();

  if (indices.length > 0) {
    lastKnownData = indices;
  }

  const payload = {
    indices: lastKnownData,
    timestamp: Date.now(),
  };

  if (lastKnownData.length > 0) {
    io.emit(SOCKET_EVENTS.TICKER_UPDATE, payload);
  }
}

export function startTickerBroadcast(io: SocketServer): void {
  console.log('[TickerService] Started');

  // Initial fetch
  broadcastTicker(io);

  // Dynamic interval based on market hours
  function scheduleNext() {
    const interval = isMarketHours() ? 10_000 : 5 * 60_000;

    if (intervalRef) clearTimeout(intervalRef);

    intervalRef = setTimeout(async () => {
      await broadcastTicker(io);
      scheduleNext();
    }, interval);
  }

  scheduleNext();
}
