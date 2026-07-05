import { Server as SocketServer } from 'socket.io';
import { SOCKET_EVENTS, MarketIndex } from '@theonetrade/shared-types';
import { generateSync } from 'otplib';

// Angel One SmartAPI credentials
const ANGEL_API_KEY = process.env.ANGEL_API_KEY || 'qr8ZFArf';
const ANGEL_CLIENT_ID = process.env.ANGEL_CLIENT_ID || 'AAAN744037';
const ANGEL_PIN = process.env.ANGEL_PIN || '1357';
const ANGEL_TOTP_SECRET = process.env.ANGEL_TOTP_SECRET || 'AFZCBEZAIBHY7OUORL2TE4HQ4Q';

// Index tokens: token → { displayName, exchangeType }
// exchangeType: 1 = NSE, 3 = BSE
const INDEX_CONFIG: Record<string, { name: string; exchange: number }> = {
  '99926000': { name: 'NIFTY 50', exchange: 1 },
  '99919000': { name: 'SENSEX', exchange: 3 },
  '99926009': { name: 'BANKNIFTY', exchange: 1 },
  '99926011': { name: 'NIFTY MIDCAP 100', exchange: 1 },
  '99926013': { name: 'NIFTY NEXT 50', exchange: 1 },
  '99926037': { name: 'FINNIFTY', exchange: 1 },
  '99926012': { name: 'NIFTY 100', exchange: 1 },
  '99926004': { name: 'NIFTY 500', exchange: 1 },
  '99926032': { name: 'NIFTY SMALLCAP 100', exchange: 1 },
};

// Display order for indices
const DISPLAY_ORDER = [
  'NIFTY 50', 'SENSEX', 'BANKNIFTY', 'NIFTY MIDCAP 100', 'NIFTY NEXT 50',
  'FINNIFTY', 'NIFTY 100', 'NIFTY 500', 'NIFTY SMALLCAP 100',
];

let lastKnownData: MarketIndex[] = [];
let socketIO: SocketServer | null = null;
let wsConnected = false;

function formatPrice(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(pChange: number): string {
  const sign = pChange >= 0 ? '+' : '';
  return `${sign}${pChange.toFixed(2)}%`;
}

// Store live prices keyed by token
const livePrices: Record<string, { ltp: number; close: number }> = {};

function buildIndicesFromLive(): MarketIndex[] {
  const indices: MarketIndex[] = [];
  for (const token of Object.keys(INDEX_CONFIG)) {
    const config = INDEX_CONFIG[token];
    const price = livePrices[token];
    if (price && price.ltp > 0) {
      const change = price.close > 0
        ? ((price.ltp - price.close) / price.close) * 100
        : 0;
      indices.push({
        name: config.name,
        price: formatPrice(price.ltp / 100), // SmartAPI sends prices in paisa
        change: formatChange(change),
        up: change >= 0,
      });
    }
  }
  // Sort by display order
  indices.sort((a, b) => DISPLAY_ORDER.indexOf(a.name) - DISPLAY_ORDER.indexOf(b.name));
  return indices;
}

function broadcastToClients() {
  if (!socketIO) return;
  const indices = buildIndicesFromLive();
  if (indices.length > 0) {
    lastKnownData = indices;
  }
  if (lastKnownData.length > 0) {
    socketIO.emit(SOCKET_EVENTS.TICKER_UPDATE, {
      indices: lastKnownData,
      timestamp: Date.now(),
    });
  }
}

async function loginAndGetTokens(): Promise<{ jwtToken: string; feedToken: string }> {
  const totp = generateSync({ secret: ANGEL_TOTP_SECRET });
  const { SmartAPI: SmartAPIClass } = require('smartapi-javascript');

  const smart = new SmartAPIClass({ api_key: ANGEL_API_KEY });
  const session = await smart.generateSession(ANGEL_CLIENT_ID, ANGEL_PIN, totp);

  if (!session?.data?.jwtToken || !session?.data?.feedToken) {
    throw new Error(`SmartAPI login failed: ${JSON.stringify(session)}`);
  }

  console.log('[TickerService] Angel One login successful');
  return {
    jwtToken: session.data.jwtToken,
    feedToken: session.data.feedToken,
  };
}

function connectWebSocket(jwtToken: string, feedToken: string) {
  const { WebSocketV2 } = require('smartapi-javascript');

  const ws = new WebSocketV2({
    jwttoken: jwtToken,
    apikey: ANGEL_API_KEY,
    clientcode: ANGEL_CLIENT_ID,
    feedtype: feedToken,
  });

  ws.connect()
    .then(() => {
      wsConnected = true;
      console.log('[TickerService] WebSocket connected - subscribing to indices');

      // Group tokens by exchange type
      const nseTokens = Object.entries(INDEX_CONFIG)
        .filter(([, c]) => c.exchange === 1)
        .map(([token]) => token);
      const bseTokens = Object.entries(INDEX_CONFIG)
        .filter(([, c]) => c.exchange === 3)
        .map(([token]) => token);

      // Subscribe NSE indices in Quote mode (mode 2 gives LTP + close price)
      if (nseTokens.length > 0) {
        ws.fetchData({
          correlationID: 'nse_indices',
          action: 1, // Subscribe
          mode: 2,   // Quote mode (LTP + OHLC + close)
          exchangeType: 1, // NSE
          tokens: nseTokens,
        });
      }

      // Subscribe BSE indices (SENSEX)
      if (bseTokens.length > 0) {
        ws.fetchData({
          correlationID: 'bse_indices',
          action: 1,
          mode: 2,
          exchangeType: 3, // BSE
          tokens: bseTokens,
        });
      }

      ws.on('tick', (data: any) => {
        if (!data) return;
        const token = typeof data.token === 'string'
          ? data.token.replace(/"/g, '').trim()
          : String(data.token || '').trim();

        if (!INDEX_CONFIG[token]) return;

        const ltp = parseFloat(data.last_traded_price) || 0;
        const close = parseFloat(data.close_price) || 0;

        livePrices[token] = { ltp, close };
        broadcastToClients();
      });
    })
    .catch((err: any) => {
      wsConnected = false;
      console.error('[TickerService] WebSocket connection failed:', err?.message || err);
      // Retry after 30 seconds
      setTimeout(() => startWebSocket(), 30_000);
    });

  // Handle reconnection
  ws.reconnection('simple', 5000);
}

async function startWebSocket() {
  try {
    const { jwtToken, feedToken } = await loginAndGetTokens();
    connectWebSocket(jwtToken, feedToken);
  } catch (err) {
    console.error('[TickerService] Login failed:', (err as Error).message);
    // Retry login after 60 seconds
    setTimeout(() => startWebSocket(), 60_000);
  }
}

// Fetch data via SmartAPI REST marketData endpoint
async function fetchViaREST() {
  try {
    const totp = generateSync({ secret: ANGEL_TOTP_SECRET });
    const { SmartAPI: SmartAPIClass } = require('smartapi-javascript');
    const smart = new SmartAPIClass({ api_key: ANGEL_API_KEY });
    await smart.generateSession(ANGEL_CLIENT_ID, ANGEL_PIN, totp);

    const nseTokens = Object.entries(INDEX_CONFIG)
      .filter(([, c]) => c.exchange === 1)
      .map(([token]) => token);
    const bseTokens = Object.entries(INDEX_CONFIG)
      .filter(([, c]) => c.exchange === 3)
      .map(([token]) => token);

    const exchangeTokens: Record<string, string[]> = {};
    if (nseTokens.length > 0) exchangeTokens['NSE'] = nseTokens;
    if (bseTokens.length > 0) exchangeTokens['BSE'] = bseTokens;

    const response = await smart.marketData({
      mode: 'FULL',
      exchangeTokens,
    });

    if (response?.data?.fetched) {
      let count = 0;
      for (const item of response.data.fetched) {
        const token = item.symbolToken || item.symboltoken;
        if (INDEX_CONFIG[token]) {
          const ltp = parseFloat(item.ltp) || 0;
          const close = parseFloat(item.close) || 0;
          livePrices[token] = { ltp: ltp * 100, close: close * 100 }; // Match WebSocket paisa format
          count++;
        }
      }
      console.log(`[TickerService] REST fetched ${count} indices`);
      broadcastToClients();
    } else {
      console.log('[TickerService] REST response:', JSON.stringify(response?.data || response).substring(0, 200));
    }
  } catch (err) {
    console.error('[TickerService] REST error:', (err as Error).message);
  }
}

function hasLiveData(): boolean {
  return Object.keys(livePrices).length > 0;
}

export function startTickerBroadcast(io: SocketServer): void {
  socketIO = io;
  console.log('[TickerService] Started — connecting to Angel One SmartAPI');

  // Fetch initial data via REST, then connect WebSocket (sequential to avoid TOTP conflict)
  fetchViaREST().then(() => {
    // Wait 35 seconds for new TOTP window before WebSocket login
    setTimeout(() => startWebSocket(), 35_000);
  });

  // Periodic REST fetch: if no live data yet or WebSocket disconnected, re-fetch every 60 seconds
  setInterval(() => {
    if (!hasLiveData() || !wsConnected) {
      console.log('[TickerService] Refreshing data via REST');
      fetchViaREST();
    }
  }, 60_000);

  // Re-login every 6 hours to refresh tokens (Angel One tokens expire)
  setInterval(() => {
    console.log('[TickerService] Refreshing Angel One session');
    startWebSocket();
  }, 6 * 60 * 60_000);
}
