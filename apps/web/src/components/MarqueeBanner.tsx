'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { SOCKET_EVENTS, MarketIndex } from '@theonetrade/shared-types';

const SOCKET_FALLBACK_TIMEOUT = 30_000; // 30 seconds

export default function MarqueeBanner() {
  const [warningText, setWarningText] = useState('');
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [marketOpen, setMarketOpen] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(0);
  const { socket } = useSocket();
  const lastSocketUpdate = useRef<number>(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get('/public/config/public').then((res) => {
      setWarningText(res.data.data?.marqueeWarningText || '');
    }).catch(() => {});
  }, []);

  // Fetch real market data via HTTP (initial load / fallback)
  const fetchViaHttp = () => {
    const path = window.location.pathname;
    const basePath = path.startsWith('/theonetrade') ? '/theonetrade' : '';
    fetch(`${basePath}/api/market-data`)
      .then((res) => res.json())
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setIndices(res.data);
        }
      })
      .catch(() => {});
  };

  // Initial HTTP fetch
  useEffect(() => {
    fetchViaHttp();
  }, []);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleTickerUpdate = (payload: {
      indices: MarketIndex[];
      timestamp: number;
      marketOpen?: boolean;
      lastUpdated?: number;
    }) => {
      if (payload.indices && payload.indices.length > 0) {
        setIndices(payload.indices);
        lastSocketUpdate.current = Date.now();
      }
      if (payload.marketOpen !== undefined) setMarketOpen(payload.marketOpen);
      if (payload.lastUpdated) setLastUpdated(payload.lastUpdated);
    };

    socket.on(SOCKET_EVENTS.TICKER_UPDATE, handleTickerUpdate);
    return () => {
      socket.off(SOCKET_EVENTS.TICKER_UPDATE, handleTickerUpdate);
    };
  }, [socket]);

  // 30-second fallback: if no socket update, re-fetch via HTTP
  useEffect(() => {
    fallbackTimerRef.current = setInterval(() => {
      if (Date.now() - lastSocketUpdate.current > SOCKET_FALLBACK_TIMEOUT) {
        fetchViaHttp();
      }
    }, SOCKET_FALLBACK_TIMEOUT);

    return () => {
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  }, []);

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Loading state — no data yet
  if (indices.length === 0) {
    // Check if market is closed (weekend or outside hours) to avoid perpetual "Loading..."
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    const day = ist.getDay();
    const minutes = ist.getHours() * 60 + ist.getMinutes();
    const isWeekend = day === 0 || day === 6;
    const isOutsideHours = minutes < 555 || minutes > 930;
    const isClosed = isWeekend || isOutsideHours;

    return (
      <>
        <div className="bg-white border-b border-gray-100 overflow-hidden">
          <div className="py-2.5 flex items-center justify-center gap-2">
            {isClosed ? (
              <span className="text-sm text-gray-400">Market Closed</span>
            ) : (
              <span className="text-sm text-gray-400">Loading market data...</span>
            )}
          </div>
        </div>
        {warningText && (
          <div className="bg-signal-red text-white py-1.5 text-center">
            <p className="text-xs font-medium">{warningText}</p>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Market index ticker */}
      <div className="bg-white border-b border-gray-100 overflow-hidden relative">
        <div className="animate-marquee whitespace-nowrap py-2.5">
          {[...indices, ...indices].map((idx, i) => (
            <span key={i} className="inline-flex items-center mx-6 text-sm">
              <span className="text-gray-400 font-medium">{idx.name}</span>
              <span className="text-text-heading font-semibold ml-2">{idx.price}</span>
              <span className={`ml-1.5 font-medium ${idx.up ? 'text-signal-green' : 'text-signal-red'}`}>
                {idx.up ? '↑' : '↓'} {idx.change}
              </span>
            </span>
          ))}
        </div>
        {/* Market status badge */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white pl-4">
          {!marketOpen && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">
              Market Closed
            </span>
          )}
          {lastUpdated > 0 && (
            <span className="text-xs text-gray-400">{formatLastUpdated()}</span>
          )}
        </div>
      </div>

      {/* Warning text — static short strip */}
      {warningText && (
        <div className="bg-signal-red text-white py-1.5 text-center">
          <p className="text-xs font-medium">{warningText}</p>
        </div>
      )}
    </>
  );
}
