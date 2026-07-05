'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { SOCKET_EVENTS, MarketIndex } from '@theonetrade/shared-types';

const FALLBACK_INDICES: MarketIndex[] = [
  { name: 'NIFTY 50', price: '24,856.30', change: '+1.12%', up: true },
  { name: 'SENSEX', price: '81,523.16', change: '+0.98%', up: true },
  { name: 'BANKNIFTY', price: '53,412.85', change: '+1.34%', up: true },
  { name: 'NIFTY MIDCAP 100', price: '62,123.35', change: '+0.52%', up: true },
  { name: 'NIFTY NEXT 50', price: '73,450.20', change: '+0.68%', up: true },
  { name: 'FINNIFTY', price: '25,120.45', change: '+0.91%', up: true },
  { name: 'NIFTY 100', price: '25,340.10', change: '+0.85%', up: true },
  { name: 'NIFTY 500', price: '23,180.75', change: '+0.72%', up: true },
  { name: 'NIFTY SMALLCAP 100', price: '18,945.60', change: '-0.15%', up: false },
];

const SOCKET_FALLBACK_TIMEOUT = 30_000; // 30 seconds

export default function MarqueeBanner() {
  const [warningText, setWarningText] = useState('');
  const [indices, setIndices] = useState<MarketIndex[]>(FALLBACK_INDICES);
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

    const handleTickerUpdate = (payload: { indices: MarketIndex[]; timestamp: number }) => {
      if (payload.indices && payload.indices.length > 0) {
        setIndices(payload.indices);
        lastSocketUpdate.current = Date.now();
      }
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

  return (
    <>
      {/* Market index ticker */}
      <div className="bg-white border-b border-gray-100 overflow-hidden">
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
