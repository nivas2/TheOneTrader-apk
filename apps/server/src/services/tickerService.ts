import { Server as SocketServer } from 'socket.io';
import { SOCKET_EVENTS, MarketIndex } from '@theonetrade/shared-types';
import { generateSync } from 'otplib';
import fs from 'fs';
import path from 'path';

// Angel One SmartAPI credentials
const ANGEL_API_KEY = process.env.ANGEL_API_KEY || 'qr8ZFArf';
const ANGEL_CLIENT_ID = process.env.ANGEL_CLIENT_ID || 'AAAN744037';
const ANGEL_PIN = process.env.ANGEL_PIN || '0987';
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

// Cache file for persisting data across restarts
const CACHE_FILE = path.join(__dirname, '..', '..', 'ticker-cache.json');

let lastKnownData: MarketIndex[] = [];
let socketIO: SocketServer | null = null;
let wsConnected = false;
let lastDataUpdate = 0;
let tickCount = 0;

// Login backoff state
let loginFailCount = 0;
let lastLoginFail = 0;
const LOGIN_BACKOFF_BASE = 5 * 60_000; // 5 minutes base backoff

// Cached session for REST calls (avoid re-login every time)
let cachedSmartInstance: any = null;
let sessionExpiry = 0;

function formatPrice(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(pChange: number): string {
  const sign = pChange >= 0 ? '+' : '';
  return `${sign}${pChange.toFixed(2)}%`;
}

function isMarketOpen(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  const day = ist.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  // 9:15 AM = 555 min, 3:30 PM = 930 min
  return minutes >= 555 && minutes <= 930;
}

// Persist data to file so it survives restarts
function saveCache() {
  try {
    const data = { indices: lastKnownData, lastUpdated: lastDataUpdate, livePrices };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {}
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      if (raw.indices?.length > 0) {
        lastKnownData = raw.indices;
        lastDataUpdate = raw.lastUpdated || 0;
        console.log(`[TickerService] Loaded ${lastKnownData.length} cached indices from disk`);
      }
      if (raw.livePrices) {
        Object.assign(livePrices, raw.livePrices);
      }
    }
  } catch {}
}

// Check if login backoff period has passed
function canAttemptLogin(): boolean {
  if (loginFailCount === 0) return true;
  const backoffMs = Math.min(LOGIN_BACKOFF_BASE * Math.pow(2, loginFailCount - 1), 30 * 60_000); // Max 30 min
  return Date.now() - lastLoginFail > backoffMs;
}

function onLoginSuccess() {
  loginFailCount = 0;
  lastLoginFail = 0;
}

function onLoginFail() {
  loginFailCount++;
  lastLoginFail = Date.now();
  const nextRetryMs = Math.min(LOGIN_BACKOFF_BASE * Math.pow(2, loginFailCount - 1), 30 * 60_000);
  console.log(`[TickerService] Login fail #${loginFailCount}, next retry in ${Math.round(nextRetryMs / 1000)}s`);
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
      if (Math.abs(change) > 10) {
        console.warn(`[TickerService] WARNING: ${config.name} change ${change.toFixed(2)}% — ltp=${price.ltp} close=${price.close} (possible stale close)`);
      }
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
    lastDataUpdate = Date.now();
    saveCache();
  }
  if (lastKnownData.length > 0) {
    socketIO.emit(SOCKET_EVENTS.TICKER_UPDATE, {
      indices: lastKnownData,
      timestamp: Date.now(),
      marketOpen: isMarketOpen(),
      lastUpdated: lastDataUpdate,
    });
  }
}

async function getOrCreateSession(): Promise<any> {
  // Reuse cached session if still valid (cache for 20 minutes)
  if (cachedSmartInstance && Date.now() < sessionExpiry) {
    return cachedSmartInstance;
  }

  const totp = generateSync({ secret: ANGEL_TOTP_SECRET });
  const { SmartAPI: SmartAPIClass } = require('smartapi-javascript');
  const smart = new SmartAPIClass({ api_key: ANGEL_API_KEY });
  const session = await smart.generateSession(ANGEL_CLIENT_ID, ANGEL_PIN, totp);

  if (!session?.data?.jwtToken) {
    throw new Error(`SmartAPI login failed: ${JSON.stringify(session)}`);
  }

  cachedSmartInstance = smart;
  sessionExpiry = Date.now() + 20 * 60_000; // Cache for 20 minutes
  onLoginSuccess();
  console.log('[TickerService] Angel One login successful');
  return smart;
}

async function loginAndGetTokens(): Promise<{ jwtToken: string; feedToken: string }> {
  const totp = generateSync({ secret: ANGEL_TOTP_SECRET });
  const { SmartAPI: SmartAPIClass } = require('smartapi-javascript');

  const smart = new SmartAPIClass({ api_key: ANGEL_API_KEY });
  const session = await smart.generateSession(ANGEL_CLIENT_ID, ANGEL_PIN, totp);

  if (!session?.data?.jwtToken || !session?.data?.feedToken) {
    throw new Error(`SmartAPI login failed: ${JSON.stringify(session)}`);
  }

  onLoginSuccess();
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
      tickCount = 0;
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

        // Log first 5 ticks for debugging
        if (tickCount < 5) {
          const config = INDEX_CONFIG[token];
          console.log(`[TickerService] WS tick #${tickCount}: ${config.name} — ltp=${ltp} close=${close} (token=${token})`);
          tickCount++;
        }

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
  if (!canAttemptLogin()) {
    const waitMs = Math.min(LOGIN_BACKOFF_BASE * Math.pow(2, loginFailCount - 1), 30 * 60_000);
    const remainMs = waitMs - (Date.now() - lastLoginFail);
    console.log(`[TickerService] Skipping WS login (backoff), retry in ${Math.round(remainMs / 1000)}s`);
    setTimeout(() => startWebSocket(), remainMs + 1000);
    return;
  }

  try {
    const { jwtToken, feedToken } = await loginAndGetTokens();
    connectWebSocket(jwtToken, feedToken);
  } catch (err) {
    onLoginFail();
    console.error('[TickerService] Login failed:', (err as Error).message);
    const backoffMs = Math.min(LOGIN_BACKOFF_BASE * Math.pow(2, loginFailCount - 1), 30 * 60_000);
    setTimeout(() => startWebSocket(), backoffMs);
  }
}

// Fetch data via SmartAPI REST marketData endpoint
async function fetchViaREST() {
  if (!canAttemptLogin()) {
    return; // Skip if in backoff period
  }

  try {
    const smart = await getOrCreateSession();

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
          console.log(`[TickerService] REST: ${INDEX_CONFIG[token].name} — ltp=${ltp} close=${close}`);
          livePrices[token] = { ltp: ltp * 100, close: close * 100 }; // Match WebSocket paisa format
          count++;
        }
      }
      console.log(`[TickerService] REST fetched ${count} indices`);
      broadcastToClients();
    } else {
      // Session might be stale, clear cache to force re-login next time
      const errMsg = JSON.stringify(response?.data || response).substring(0, 200);
      console.log('[TickerService] REST response:', errMsg);
      if (errMsg.includes('Token missing') || errMsg.includes('Invalid Token')) {
        cachedSmartInstance = null;
        sessionExpiry = 0;
      }
    }
  } catch (err) {
    onLoginFail();
    cachedSmartInstance = null;
    sessionExpiry = 0;
    console.error('[TickerService] REST error:', (err as Error).message);
  }
}

export function getTickerData() {
  return {
    indices: lastKnownData,
    timestamp: Date.now(),
    marketOpen: isMarketOpen(),
    lastUpdated: lastDataUpdate,
  };
}

export function startTickerBroadcast(io: SocketServer): void {
  socketIO = io;
  console.log('[TickerService] Started — connecting to Angel One SmartAPI');

  // Load cached data from disk (survives restarts)
  loadCache();

  // Broadcast cached data immediately to any connected clients
  if (lastKnownData.length > 0) {
    console.log(`[TickerService] Broadcasting ${lastKnownData.length} cached indices`);
    io.emit(SOCKET_EVENTS.TICKER_UPDATE, {
      indices: lastKnownData,
      timestamp: Date.now(),
      marketOpen: isMarketOpen(),
      lastUpdated: lastDataUpdate,
    });
  }

  // Fetch initial data via REST, then connect WebSocket (sequential to avoid TOTP conflict)
  fetchViaREST().then(() => {
    // Wait 35 seconds for new TOTP window before WebSocket login
    setTimeout(() => startWebSocket(), 35_000);
  });

  // Refresh via REST every 60s during market hours, every 5 min outside
  setInterval(() => {
    if (isMarketOpen()) {
      fetchViaREST();
    }
  }, 60_000);

  // Also do a less frequent refresh when market is closed (every 5 min)
  setInterval(() => {
    if (!isMarketOpen() && lastKnownData.length === 0) {
      console.log('[TickerService] Market closed, attempting data fetch for cache');
      fetchViaREST();
    }
  }, 5 * 60_000);

  // Re-login every 6 hours to refresh tokens (Angel One tokens expire)
  setInterval(() => {
    console.log('[TickerService] Refreshing Angel One session');
    cachedSmartInstance = null;
    sessionExpiry = 0;
    startWebSocket();
  }, 6 * 60 * 60_000);
}
