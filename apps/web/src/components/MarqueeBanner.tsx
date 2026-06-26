'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface MarketIndex {
  name: string;
  price: string;
  change: string;
  up: boolean;
}

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

export default function MarqueeBanner() {
  const [warningText, setWarningText] = useState('');
  const [indices, setIndices] = useState<MarketIndex[]>(FALLBACK_INDICES);

  useEffect(() => {
    api.get('/public/config/public').then((res) => {
      setWarningText(res.data.data?.marqueeWarningText || '');
    }).catch(() => {});
  }, []);

  // Fetch real market data
  useEffect(() => {
    // Detect basePath from current URL (e.g. /theonetrade)
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
